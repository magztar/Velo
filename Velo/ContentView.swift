//
//  ContentView.swift
//  Velo
//
//  Created by Magnus Larsson on 2026-05-20.
//

import Foundation
import SwiftData
import SwiftUI

#if canImport(HealthKit)
import HealthKit
#endif

struct ContentView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Oversikt", systemImage: "speedometer")
                }

            ActivitiesView()
                .tabItem {
                    Label("Aktiviteter", systemImage: "bicycle")
                }

            HealthSyncView()
                .tabItem {
                    Label("Health Sync", systemImage: "heart.text.square")
                }
        }
    }
}

private struct DashboardView: View {
    @Query private var activities: [RideActivity]
    @Query private var measurements: [HealthMeasurementRecord]

    var body: some View {
        NavigationStack {
            List {
                Section("Status") {
                    StatRow(title: "Aktiviteter", value: "\(activities.count)")
                    StatRow(title: "Matningar", value: "\(measurements.count)")

                    if let last = activities.sorted(by: { $0.startedAt > $1.startedAt }).first {
                        StatRow(
                            title: "Senaste synk",
                            value: last.startedAt.formatted(date: .abbreviated, time: .shortened)
                        )
                    }
                }

                Section("Datakalla") {
                    Text("Appen kor helt native med lokal lagring i SwiftData och HealthKit-import.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Velo")
        }
    }
}

private struct ActivitiesView: View {
    @Query(sort: \RideActivity.startedAt, order: .reverse) private var activities: [RideActivity]

    var body: some View {
        NavigationStack {
            List {
                if activities.isEmpty {
                    Text("Inga aktiviteter ännu. Kor Health Sync for att importera data.")
                        .foregroundStyle(.secondary)
                }

                ForEach(activities) { activity in
                    Section {
                        ForEach(activity.measurements) { measurement in
                            HStack {
                                Text(measurement.measurementType)
                                Spacer()
                                Text("\(format(measurement.value)) \(measurement.unit)")
                                    .fontWeight(.semibold)
                            }
                            .font(.subheadline)
                        }
                    } header: {
                        Text(activity.startedAt.formatted(date: .abbreviated, time: .shortened))
                    }
                }
            }
            .navigationTitle("Aktiviteter")
        }
    }

    private func format(_ value: Double) -> String {
        if value.rounded() == value {
            return String(Int(value))
        }
        return String(format: "%.1f", value)
    }
}

private struct HealthSyncView: View {
    @Environment(\.modelContext) private var modelContext

    @State private var isSyncing = false
    @State private var statusMessage = "Ingen synk kord an." 

    private let syncCoordinator = HealthDataSyncCoordinator()

    var body: some View {
        NavigationStack {
            Form {
                Section("Import") {
                    Button {
                        Task {
                            await syncHealthData()
                        }
                    } label: {
                        if isSyncing {
                            HStack {
                                ProgressView()
                                Text("Synkar...")
                            }
                        } else {
                            Label("Importera fran HealthKit", systemImage: "arrow.down.circle")
                        }
                    }
                    .disabled(isSyncing)

                    Text(statusMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Health Sync")
        }
    }

    @MainActor
    private func syncHealthData() async {
        isSyncing = true
        statusMessage = "Laser HealthKit-data..."

        do {
            let report = try await syncCoordinator.syncIntoLocalStore(modelContext: modelContext)
            statusMessage = "Klart. Sparade \(report.savedCount) matningar i appen."
        } catch {
            statusMessage = "Synk misslyckades: \(error.localizedDescription)"
        }

        isSyncing = false
    }
}

private struct StatRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
        }
    }
}

private struct HealthMeasurement {
    let measurementType: String
    let value: Double
    let unit: String
}

private struct LocalSyncReport {
    let savedCount: Int
}

private enum HealthSyncError: LocalizedError {
    case unsupportedPlatform
    case noMeasurementsFound

    var errorDescription: String? {
        switch self {
        case .unsupportedPlatform:
            return "HealthKit stods bara pa iOS/watchOS."
        case .noMeasurementsFound:
            return "Inga halsomatningar hittades i HealthKit."
        }
    }
}

private final class HealthDataSyncCoordinator {
    func syncIntoLocalStore(modelContext: ModelContext) async throws -> LocalSyncReport {
        let measurements = try await HealthKitReader().readMeasurements()
        guard !measurements.isEmpty else {
            throw HealthSyncError.noMeasurementsFound
        }

        let activity = RideActivity(startedAt: .now, source: "HealthKit")
        modelContext.insert(activity)

        for measurement in measurements {
            let record = HealthMeasurementRecord(
                measurementType: measurement.measurementType,
                value: measurement.value,
                unit: measurement.unit,
                recordedAt: .now,
                activity: activity
            )
            modelContext.insert(record)
        }

        try modelContext.save()
        return LocalSyncReport(savedCount: measurements.count)
    }
}

private struct HealthKitReader {
    func readMeasurements() async throws -> [HealthMeasurement] {
#if canImport(HealthKit) && os(iOS)
        let store = HKHealthStore()

        let sampleTypes: Set<HKSampleType> = [
            HKQuantityType(.heartRate),
            HKQuantityType(.activeEnergyBurned),
            HKQuantityType(.stepCount),
            HKQuantityType(.oxygenSaturation),
        ]

        try await requestAuthorization(store: store, sampleTypes: sampleTypes)

        var measurements: [HealthMeasurement] = []

        if let latestHeartRate = try await latestSample(
            for: .heartRate,
            unit: HKUnit.count().unitDivided(by: .minute()),
            store: store
        ) {
            measurements.append(.init(measurementType: "heart_rate", value: latestHeartRate, unit: "bpm"))
        }

        if let stepsToday = try await cumulativeToday(
            for: .stepCount,
            unit: .count(),
            store: store
        ) {
            measurements.append(.init(measurementType: "steps", value: stepsToday, unit: "steps"))
        }

        if let activeEnergyToday = try await cumulativeToday(
            for: .activeEnergyBurned,
            unit: .kilocalorie(),
            store: store
        ) {
            measurements.append(.init(measurementType: "calories", value: activeEnergyToday, unit: "kcal"))
        }

        if let oxygenSaturation = try await latestSample(
            for: .oxygenSaturation,
            unit: .percent(),
            store: store
        ) {
            measurements.append(.init(measurementType: "oxygen_saturation", value: oxygenSaturation * 100, unit: "%"))
        }

        return measurements
#else
        throw HealthSyncError.unsupportedPlatform
#endif
    }

#if canImport(HealthKit) && os(iOS)
    private func requestAuthorization(store: HKHealthStore, sampleTypes: Set<HKSampleType>) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            store.requestAuthorization(toShare: [], read: sampleTypes) { success, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                if success {
                    continuation.resume(returning: ())
                } else {
                    continuation.resume(throwing: HealthSyncError.noMeasurementsFound)
                }
            }
        }
    }

    private func latestSample(
        for identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        store: HKHealthStore
    ) async throws -> Double? {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            return nil
        }

        let sortDescriptors = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]

        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Double?, Error>) in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: nil,
                limit: 1,
                sortDescriptors: sortDescriptors
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let quantitySample = samples?.first as? HKQuantitySample
                continuation.resume(returning: quantitySample?.quantity.doubleValue(for: unit))
            }

            store.execute(query)
        }
    }

    private func cumulativeToday(
        for identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        store: HKHealthStore
    ) async throws -> Double? {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            return nil
        }

        let startOfDay = Calendar.current.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date())

        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Double?, Error>) in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, statistics, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let total = statistics?.sumQuantity()?.doubleValue(for: unit)
                continuation.resume(returning: total)
            }

            store.execute(query)
        }
    }
#endif
}

#Preview {
    ContentView()
        .modelContainer(for: [RideActivity.self, HealthMeasurementRecord.self], inMemory: true)
}
