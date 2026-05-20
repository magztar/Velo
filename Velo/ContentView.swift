//
//  ContentView.swift
//  Velo
//
//  Created by Magnus Larsson on 2026-05-20.
//

import Foundation
import SwiftData
import SwiftUI
import UniformTypeIdentifiers

#if canImport(HealthKit)
import HealthKit
#endif

struct ContentView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "speedometer")
                }

            ActivitiesView()
                .tabItem {
                    Label("Activities", systemImage: "bicycle")
                }

            FavoritesView()
                .tabItem {
                    Label("Favorites", systemImage: "star.fill")
                }

            BikesView()
                .tabItem {
                    Label("Bikes", systemImage: "bolt.circle")
                }

            HealthView()
                .tabItem {
                    Label("Health", systemImage: "heart.text.square")
                }

            ImportView()
                .tabItem {
                    Label("Import", systemImage: "square.and.arrow.down")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
    }
}

private struct DashboardView: View {
    @Query(sort: \RideActivity.startedAt, order: .reverse) private var activities: [RideActivity]

    private var totalDistance: Double { activities.reduce(0) { $0 + $1.distanceKm } }
    private var totalDuration: Double { activities.reduce(0) { $0 + $1.durationMinutes } }
    private var totalCalories: Double {
        activities.reduce(0) { sum, activity in
            sum + activity.measurements
                .filter { $0.measurementType == "calories" }
                .reduce(0) { $0 + $1.value }
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Summary") {
                    StatRow(title: "Activities", value: "\(activities.count)")
                    StatRow(title: "Distance", value: "\(totalDistance, specifier: "%.1f") km")
                    StatRow(title: "Time", value: durationText(totalDuration))
                    StatRow(title: "Calories", value: "\(Int(totalCalories)) kcal")
                }

                Section("Recent") {
                    if activities.isEmpty {
                        Text("No activities yet.")
                            .foregroundStyle(.secondary)
                    }

                    ForEach(Array(activities.prefix(5))) { activity in
                        NavigationLink(destination: ActivityDetailView(activity: activity)) {
                            ActivityRow(activity: activity)
                        }
                    }
                }
            }
            .navigationTitle("Velo")
        }
    }

    private func durationText(_ minutes: Double) -> String {
        let hours = Int(minutes) / 60
        let mins = Int(minutes) % 60
        return "\(hours)h \(mins)m"
    }
}

private struct ActivitiesView: View {
    @Query(sort: \RideActivity.startedAt, order: .reverse) private var activities: [RideActivity]
    @State private var search = ""
    @State private var typeFilter = "all"
    @State private var sortBy = "newest"

    private let types = ["all", "cycling", "ebike", "mountainbike", "walking", "hiking", "running", "car", "boat", "other"]

    var filteredActivities: [RideActivity] {
        var result = activities

        if !search.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let s = search.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(s) || $0.note.lowercased().contains(s)
            }
        }

        if typeFilter != "all" {
            result = result.filter { $0.activityType == typeFilter }
        }

        switch sortBy {
        case "oldest":
            result.sort { $0.startedAt < $1.startedAt }
        case "longest":
            result.sort { $0.distanceKm > $1.distanceKm }
        case "shortest":
            result.sort { $0.distanceKm < $1.distanceKm }
        default:
            result.sort { $0.startedAt > $1.startedAt }
        }

        return result
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField("Search activities", text: $search)

                    Picker("Type", selection: $typeFilter) {
                        ForEach(types, id: \.self) { type in
                            Text(type.capitalized).tag(type)
                        }
                    }

                    Picker("Sort", selection: $sortBy) {
                        Text("Newest").tag("newest")
                        Text("Oldest").tag("oldest")
                        Text("Longest").tag("longest")
                        Text("Shortest").tag("shortest")
                    }
                }

                Section("All Activities") {
                    if filteredActivities.isEmpty {
                        Text("No activities match your filters.")
                            .foregroundStyle(.secondary)
                    }

                    ForEach(filteredActivities) { activity in
                        NavigationLink(destination: ActivityDetailView(activity: activity)) {
                            ActivityRow(activity: activity)
                        }
                    }
                }
            }
            .navigationTitle("Activities")
        }
    }
}

private struct ActivityDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var activity: RideActivity

    var body: some View {
        List {
            Section("Overview") {
                StatRow(title: "Type", value: activity.activityType)
                StatRow(title: "Distance", value: "\(activity.distanceKm, specifier: "%.1f") km")
                StatRow(title: "Duration", value: "\(Int(activity.durationMinutes)) min")
                StatRow(title: "Avg speed", value: "\(activity.avgSpeedKmh, specifier: "%.1f") km/h")
                StatRow(title: "Max speed", value: "\(activity.maxSpeedKmh, specifier: "%.1f") km/h")
                StatRow(title: "Elevation", value: "\(Int(activity.elevationGainM)) m")
                StatRow(title: "Bike", value: activity.bikeName.isEmpty ? "-" : activity.bikeName)
                Toggle("Favorite", isOn: $activity.isFavorite)
            }

            if !activity.note.isEmpty {
                Section("Note") {
                    Text(activity.note)
                }
            }

            Section("Health Measurements") {
                if activity.measurements.isEmpty {
                    Text("No health measurements")
                        .foregroundStyle(.secondary)
                }

                ForEach(activity.measurements) { measurement in
                    HStack {
                        Text(measurement.measurementType)
                        Spacer()
                        Text("\(measurement.value, specifier: "%.1f") \(measurement.unit)")
                    }
                }
            }

            Section {
                Button(role: .destructive) {
                    modelContext.delete(activity)
                } label: {
                    Text("Delete activity")
                }
            }
        }
        .navigationTitle(activity.name)
    }
}

private struct FavoritesView: View {
    @Query(sort: \RideActivity.startedAt, order: .reverse) private var activities: [RideActivity]

    var favorites: [RideActivity] {
        activities.filter { $0.isFavorite }
    }

    var body: some View {
        NavigationStack {
            List {
                if favorites.isEmpty {
                    Text("No favorites yet.")
                        .foregroundStyle(.secondary)
                }

                ForEach(favorites) { activity in
                    NavigationLink(destination: ActivityDetailView(activity: activity)) {
                        ActivityRow(activity: activity)
                    }
                }
            }
            .navigationTitle("Favorites")
        }
    }
}

private struct BikesView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Bike.createdAt, order: .reverse) private var bikes: [Bike]

    @State private var showAdd = false
    @State private var name = ""
    @State private var brand = ""
    @State private var model = ""
    @State private var bikeType = "ebike"
    @State private var isEBike = false
    @State private var displayType = ""
    @State private var motorType = ""

    var body: some View {
        NavigationStack {
            List {
                if bikes.isEmpty {
                    Text("No bikes added.")
                        .foregroundStyle(.secondary)
                }

                ForEach(bikes) { bike in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(bike.name)
                                .font(.headline)
                            Spacer()
                            Button(role: .destructive) {
                                modelContext.delete(bike)
                            } label: {
                                Image(systemName: "trash")
                            }
                        }

                        Text([bike.brand, bike.model].filter { !$0.isEmpty }.joined(separator: " "))
                            .foregroundStyle(.secondary)

                        Text("\(bike.bikeType) | \(Int(bike.totalDistanceKm)) km | \(bike.totalActivities) activities")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Bikes")
            .toolbar {
                Button {
                    showAdd = true
                } label: {
                    Image(systemName: "plus")
                }
            }
            .sheet(isPresented: $showAdd) {
                NavigationStack {
                    Form {
                        TextField("Name", text: $name)
                        TextField("Brand", text: $brand)
                        TextField("Model", text: $model)

                        Picker("Type", selection: $bikeType) {
                            Text("Road").tag("road")
                            Text("Mountain").tag("mountain")
                            Text("Ebike").tag("ebike")
                            Text("Hybrid").tag("hybrid")
                            Text("Gravel").tag("gravel")
                            Text("City").tag("city")
                            Text("Other").tag("other")
                        }

                        Toggle("E-bike", isOn: $isEBike)

                        if isEBike {
                            TextField("Display type", text: $displayType)
                            TextField("Motor type", text: $motorType)
                        }
                    }
                    .navigationTitle("Add Bike")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { showAdd = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Save") {
                                let bike = Bike(
                                    name: name,
                                    brand: brand,
                                    model: model,
                                    bikeType: bikeType,
                                    isEBike: isEBike,
                                    displayType: displayType,
                                    motorType: motorType
                                )
                                modelContext.insert(bike)
                                resetBikeForm()
                                showAdd = false
                            }
                            .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                    }
                }
            }
        }
    }

    private func resetBikeForm() {
        name = ""
        brand = ""
        model = ""
        bikeType = "ebike"
        isEBike = false
        displayType = ""
        motorType = ""
    }
}

private struct HealthView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \HealthSource.createdAt, order: .reverse) private var sources: [HealthSource]

    @State private var isSyncing = false
    @State private var status = "No sync started."

    private let syncCoordinator = HealthDataSyncCoordinator()

    var body: some View {
        NavigationStack {
            List {
                Section("Connected Sources") {
                    if sources.isEmpty {
                        Text("No connected sources")
                            .foregroundStyle(.secondary)
                    }

                    ForEach(sources.filter { $0.isConnected }) { source in
                        HStack {
                            Text(source.sourceName)
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        }
                    }
                }

                Section("HealthKit Sync") {
                    Button {
                        Task {
                            await runSync()
                        }
                    } label: {
                        if isSyncing {
                            ProgressView("Syncing...")
                        } else {
                            Label("Import from HealthKit", systemImage: "arrow.down.circle")
                        }
                    }
                    .disabled(isSyncing)

                    Text(status)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Health")
        }
    }

    @MainActor
    private func runSync() async {
        isSyncing = true
        do {
            let report = try await syncCoordinator.syncIntoLocalStore(modelContext: modelContext)
            ensureAppleHealthSourceExists()
            status = "Saved \(report.savedCount) measurements"
        } catch {
            status = error.localizedDescription
        }
        isSyncing = false
    }

    private func ensureAppleHealthSourceExists() {
        let hasSource = sources.contains { $0.platform == "apple_health" }
        if !hasSource {
            let source = HealthSource(platform: "apple_health", sourceName: "Apple Health", isConnected: true)
            modelContext.insert(source)
        }
    }
}

private struct ImportView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var showImporter = false
    @State private var selectedActivityType = "cycling"
    @State private var customName = ""
    @State private var importStatus = "Choose a file to import."

    var body: some View {
        NavigationStack {
            Form {
                Section("Import") {
                    Picker("Activity type", selection: $selectedActivityType) {
                        Text("Cycling").tag("cycling")
                        Text("Ebike").tag("ebike")
                        Text("Mountainbike").tag("mountainbike")
                        Text("Walking").tag("walking")
                        Text("Hiking").tag("hiking")
                        Text("Running").tag("running")
                        Text("Car").tag("car")
                        Text("Boat").tag("boat")
                        Text("Other").tag("other")
                    }

                    TextField("Activity name (optional)", text: $customName)

                    Button("Select file") {
                        showImporter = true
                    }

                    Text(importStatus)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Import")
            .fileImporter(
                isPresented: $showImporter,
                allowedContentTypes: [.json, .xml, .commaSeparatedText, .plainText],
                allowsMultipleSelection: false
            ) { result in
                handleImportResult(result)
            }
        }
    }

    private func handleImportResult(_ result: Result<[URL], Error>) {
        switch result {
        case .failure(let error):
            importStatus = "Import failed: \(error.localizedDescription)"
        case .success(let urls):
            guard let url = urls.first else {
                importStatus = "No file selected"
                return
            }

            do {
                let imported = try importActivity(from: url)
                modelContext.insert(imported)
                try modelContext.save()
                importStatus = "Imported \"\(imported.name)\""
                customName = ""
            } catch {
                importStatus = "Import failed: \(error.localizedDescription)"
            }
        }
    }

    private func importActivity(from url: URL) throws -> RideActivity {
        let didStart = url.startAccessingSecurityScopedResource()
        defer {
            if didStart {
                url.stopAccessingSecurityScopedResource()
            }
        }

        let content = try String(contentsOf: url)
        let fallbackName = url.deletingPathExtension().lastPathComponent
        let name = customName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? fallbackName : customName

        let distance = extractNumber(keys: ["distance_km", "distance", "km"], from: content) ?? 0
        let duration = extractNumber(keys: ["duration_minutes", "duration", "minutes"], from: content) ?? 0

        return RideActivity(
            name: name,
            activityType: selectedActivityType,
            startedAt: .now,
            source: "import",
            distanceKm: distance,
            durationMinutes: duration,
            note: "Imported from \(url.lastPathComponent)"
        )
    }

    private func extractNumber(keys: [String], from text: String) -> Double? {
        for key in keys {
            let pattern = "\\\"\(key)\\\"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)"
            if let regex = try? NSRegularExpression(pattern: pattern),
               let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
               let range = Range(match.range(at: 1), in: text) {
                return Double(text[range])
            }
        }

        // CSV fallback for headers like distance_km,duration_minutes
        let lines = text.components(separatedBy: .newlines)
        guard lines.count >= 2 else { return nil }
        let headers = lines[0].split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        let values = lines[1].split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        for key in keys {
            if let idx = headers.firstIndex(of: key), idx < values.count, let number = Double(values[idx]) {
                return number
            }
        }
        return nil
    }
}

private struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var activities: [RideActivity]
    @Query private var bikes: [Bike]
    @Query private var sources: [HealthSource]

    @State private var fullName = "Velo User"
    @State private var email = "user@velo.app"

    var body: some View {
        NavigationStack {
            List {
                Section("Profile") {
                    TextField("Name", text: $fullName)
                    TextField("Email", text: $email)
                }

                Section("Privacy") {
                    Text("Data is stored locally on your device with SwiftData.")
                    Text("Health data is read only after explicit permission.")
                }

                Section("Danger Zone") {
                    Button(role: .destructive) {
                        deleteAllData()
                    } label: {
                        Text("Delete all local data")
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }

    private func deleteAllData() {
        for activity in activities {
            modelContext.delete(activity)
        }
        for bike in bikes {
            modelContext.delete(bike)
        }
        for source in sources {
            modelContext.delete(source)
        }
    }
}

private struct ActivityRow: View {
    let activity: RideActivity

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(activity.name)
                    .font(.headline)
                Text("\(activity.activityType) | \(activity.distanceKm, specifier: "%.1f") km")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if activity.isFavorite {
                Image(systemName: "star.fill")
                    .foregroundStyle(.yellow)
            }
        }
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
            return "HealthKit is available only on iOS/watchOS."
        case .noMeasurementsFound:
            return "No HealthKit measurements found."
        }
    }
}

private final class HealthDataSyncCoordinator {
    func syncIntoLocalStore(modelContext: ModelContext) async throws -> LocalSyncReport {
        let measurements = try await HealthKitReader().readMeasurements()
        guard !measurements.isEmpty else {
            throw HealthSyncError.noMeasurementsFound
        }

        let activity = RideActivity(
            name: "Health sync",
            activityType: "cycling",
            startedAt: .now,
            source: "healthkit"
        )
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
        .modelContainer(for: [RideActivity.self, HealthMeasurementRecord.self, Bike.self, HealthSource.self], inMemory: true)
}
