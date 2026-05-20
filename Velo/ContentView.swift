//
//  ContentView.swift
//  Velo
//
//  Created by Magnus Larsson on 2026-05-20.
//

import Foundation
import SwiftUI

#if canImport(HealthKit)
import HealthKit
#endif

struct ContentView: View {
    @AppStorage("base44.receiveHealthDataURL") private var receiveHealthDataURL = ""
    @AppStorage("base44.sessionToken") private var sessionToken = ""
    @AppStorage("base44.activityID") private var activityID = ""

    @State private var isSyncing = false
    @State private var statusMessage = "Ingen synk körd ännu."

    private let syncCoordinator = HealthDataSyncCoordinator()

    var body: some View {
        NavigationStack {
            Form {
                Section("Base44") {
                    TextField(
                        "https://[APP_URL]/api/v1/functions/receiveHealthData",
                        text: $receiveHealthDataURL
                    )
                    .textInputAutocapitalization(.never)
                    .disableAutocorrection(true)

                    TextField("Session token", text: $sessionToken)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)

                    TextField("Activity ID", text: $activityID)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                }

                Section("Health Sync") {
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
                            Label("Skicka hälsodata", systemImage: "heart.text.square")
                        }
                    }
                    .disabled(isSyncing)

                    Text(statusMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Velo Health Sync")
        }
    }

    @MainActor
    private func syncHealthData() async {
        guard !receiveHealthDataURL.isEmpty else {
            statusMessage = "Ange URL till receiveHealthData-funktionen."
            return
        }

        guard !sessionToken.isEmpty else {
            statusMessage = "Ange en giltig sessiontoken från Base44 Auth."
            return
        }

        guard !activityID.isEmpty else {
            statusMessage = "Ange ett activity_id från Base44."
            return
        }

        isSyncing = true
        statusMessage = "Hämtar HealthKit-data..."

        do {
            let report = try await syncCoordinator.sync(
                endpoint: receiveHealthDataURL,
                sessionToken: sessionToken,
                activityID: activityID
            )

            statusMessage = "Klart. Skickade \(report.sentCount) mätningar till Base44."
        } catch {
            statusMessage = "Synk misslyckades: \(error.localizedDescription)"
        }

        isSyncing = false
    }
}

private struct HealthMeasurementPayload: Encodable {
    let activityID: String
    let measurementType: String
    let value: Double
    let unit: String

    enum CodingKeys: String, CodingKey {
        case activityID = "activity_id"
        case measurementType = "measurement_type"
        case value
        case unit
    }
}

private struct HealthMeasurement {
    let measurementType: String
    let value: Double
    let unit: String
}

private struct HealthSyncReport {
    let sentCount: Int
}

private enum HealthSyncError: LocalizedError {
    case invalidEndpoint
    case unsupportedPlatform
    case noMeasurementsFound
    case invalidResponse
    case serverError(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .invalidEndpoint:
            return "Ogiltig endpoint-URL."
        case .unsupportedPlatform:
            return "HealthKit stöds bara på iOS/watchOS."
        case .noMeasurementsFound:
            return "Inga hälsomätningar hittades i HealthKit."
        case .invalidResponse:
            return "Fick ogiltigt svar från backend."
        case .serverError(let statusCode):
            return "Backend svarade med HTTP \(statusCode)."
        }
    }
}

private final class Base44HealthClient {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func send(
        measurement: HealthMeasurement,
        activityID: String,
        endpoint: URL,
        sessionToken: String
    ) async throws {
        let payload = HealthMeasurementPayload(
            activityID: activityID,
            measurementType: measurement.measurementType,
            value: measurement.value,
            unit: measurement.unit
        )

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(payload)

        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw HealthSyncError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw HealthSyncError.serverError(statusCode: httpResponse.statusCode)
        }
    }
}

private final class HealthDataSyncCoordinator {
    private let client = Base44HealthClient()

    func sync(endpoint: String, sessionToken: String, activityID: String) async throws -> HealthSyncReport {
        guard let url = URL(string: endpoint) else {
            throw HealthSyncError.invalidEndpoint
        }

        let measurements = try await HealthKitReader().readMeasurements()
        guard !measurements.isEmpty else {
            throw HealthSyncError.noMeasurementsFound
        }

        for measurement in measurements {
            try await client.send(
                measurement: measurement,
                activityID: activityID,
                endpoint: url,
                sessionToken: sessionToken
            )
        }

        return HealthSyncReport(sentCount: measurements.count)
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
}
