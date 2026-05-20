//
//  ContentView.swift
//  Velo
//
//  Created by Magnus Larsson on 2026-05-20.
//

import CoreLocation
import Foundation
import SwiftData
import SwiftUI
import UniformTypeIdentifiers

#if canImport(MapKit)
import MapKit
#endif

#if canImport(PhotosUI)
import PhotosUI
#endif

#if canImport(HealthKit)
import HealthKit
#endif

#if os(iOS)
import UIKit
#endif

#if os(macOS)
import AppKit
#endif

struct ContentView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "speedometer") }

            ActivitiesView()
                .tabItem { Label("Activities", systemImage: "bicycle") }

            FavoritesView()
                .tabItem { Label("Favorites", systemImage: "star.fill") }

            BikesView()
                .tabItem { Label("Bikes", systemImage: "bolt.circle") }

            HealthView()
                .tabItem { Label("Health", systemImage: "heart.text.square") }

            ImportView()
                .tabItem { Label("Import", systemImage: "square.and.arrow.down") }

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
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
                    StatRow(title: "Distance", value: "\(oneDecimal(totalDistance)) km")
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
    @State private var showAllRoutesMap = false

    private let types = ["all", "cycling", "ebike", "mountainbike", "walking", "hiking", "running", "car", "boat", "other"]

    private var filteredActivities: [RideActivity] {
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

                    Button(showAllRoutesMap ? "Hide all routes map" : "Show all routes map") {
                        showAllRoutesMap.toggle()
                    }
                }

                if showAllRoutesMap {
                    Section("Routes Map") {
                        AllRoutesMapView(activities: filteredActivities)
                            .frame(height: 260)
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

#if canImport(PhotosUI)
    @State private var selectedPhotoItem: PhotosPickerItem?
#endif

    private var sortedPoints: [RoutePoint] {
        activity.routePoints.sorted { $0.sequence < $1.sequence }
    }

    private var sortedPhotos: [ActivityPhoto] {
        activity.photos.sorted { $0.createdAt < $1.createdAt }
    }

    var body: some View {
        List {
            Section("Overview") {
                StatRow(title: "Type", value: activity.activityType)
                StatRow(title: "Distance", value: "\(oneDecimal(activity.distanceKm)) km")
                StatRow(title: "Duration", value: "\(Int(activity.durationMinutes)) min")
                StatRow(title: "Avg speed", value: "\(oneDecimal(activity.avgSpeedKmh)) km/h")
                StatRow(title: "Max speed", value: "\(oneDecimal(activity.maxSpeedKmh)) km/h")
                StatRow(title: "Elevation", value: "\(Int(activity.elevationGainM)) m")
                StatRow(title: "Bike", value: activity.bikeName.isEmpty ? "-" : activity.bikeName)
                Toggle("Favorite", isOn: $activity.isFavorite)
            }

            if !activity.note.isEmpty {
                Section("Note") {
                    Text(activity.note)
                }
            }

            Section("Route") {
                if sortedPoints.count > 1 {
                    RouteMapView(points: sortedPoints)
                        .frame(height: 280)
                } else {
                    Text("No route points available")
                        .foregroundStyle(.secondary)
                }
            }

            Section("Elevation") {
                if sortedPoints.contains(where: { $0.elevationM != nil }) {
                    ElevationMiniChart(points: sortedPoints)
                        .frame(height: 140)
                } else {
                    Text("No elevation data available")
                        .foregroundStyle(.secondary)
                }
            }

            Section("Health Measurements") {
                if activity.measurements.isEmpty {
                    Text("No health measurements")
                        .foregroundStyle(.secondary)
                }

                ForEach(activity.measurements.sorted(by: { $0.recordedAt < $1.recordedAt })) { measurement in
                    HStack {
                        Text(measurement.measurementType)
                        Spacer()
                        Text("\(oneDecimal(measurement.value)) \(measurement.unit)")
                    }
                }
            }

            Section("Photos") {
#if canImport(PhotosUI)
                PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                    Label("Add photo", systemImage: "photo.badge.plus")
                }
#endif

                if sortedPhotos.isEmpty {
                    Text("No photos for this activity")
                        .foregroundStyle(.secondary)
                } else {
                    PhotoTimelineView(photos: sortedPhotos)
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
#if canImport(PhotosUI)
        .onChange(of: selectedPhotoItem) { _, newItem in
            guard let newItem else { return }
            Task {
                await addPhoto(from: newItem)
            }
        }
#endif
    }

#if canImport(PhotosUI)
    @MainActor
    private func addPhoto(from item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self) else {
            return
        }

        guard let imagePath = ImageStorage.saveImageData(data) else {
            return
        }

        let photo = ActivityPhoto(imagePath: imagePath, activity: activity)
        modelContext.insert(photo)
        try? modelContext.save()
        selectedPhotoItem = nil
    }
#endif
}

private struct FavoritesView: View {
    @Query(sort: \RideActivity.startedAt, order: .reverse) private var activities: [RideActivity]

    private var favorites: [RideActivity] {
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
                        Task { await runSync() }
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
    @State private var importStatus = "Choose GPX, TCX, KML, GeoJSON, JSON or CSV file."

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

            let didStart = url.startAccessingSecurityScopedResource()
            defer {
                if didStart {
                    url.stopAccessingSecurityScopedResource()
                }
            }

            do {
                let parsed = try FileActivityParser.parse(url: url)
                let fallbackName = url.deletingPathExtension().lastPathComponent
                let name = customName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? (parsed.name ?? fallbackName) : customName

                let activity = RideActivity(
                    name: name,
                    activityType: selectedActivityType,
                    startedAt: parsed.startTime ?? .now,
                    endedAt: parsed.endTime,
                    source: "import",
                    distanceKm: parsed.distanceKm,
                    durationMinutes: parsed.durationMinutes,
                    avgSpeedKmh: parsed.avgSpeedKmh,
                    maxSpeedKmh: parsed.maxSpeedKmh,
                    elevationGainM: parsed.elevationGainM,
                    note: "Imported from \(url.lastPathComponent)"
                )

                modelContext.insert(activity)

                for (index, point) in parsed.routePoints.enumerated() {
                    modelContext.insert(
                        RoutePoint(
                            sequence: index,
                            latitude: point.latitude,
                            longitude: point.longitude,
                            elevationM: point.elevationM,
                            timestamp: point.timestamp,
                            activity: activity
                        )
                    )
                }

                try modelContext.save()
                importStatus = "Imported \"\(activity.name)\" with \(parsed.routePoints.count) route points"
                customName = ""
            } catch {
                importStatus = "Import failed: \(error.localizedDescription)"
            }
        }
    }
}

private struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var activities: [RideActivity]
    @Query private var bikes: [Bike]
    @Query private var sources: [HealthSource]
    @Query private var routePoints: [RoutePoint]
    @Query private var photos: [ActivityPhoto]

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
        for photo in photos { modelContext.delete(photo) }
        for point in routePoints { modelContext.delete(point) }
        for activity in activities { modelContext.delete(activity) }
        for bike in bikes { modelContext.delete(bike) }
        for source in sources { modelContext.delete(source) }
    }
}

private struct ActivityRow: View {
    let activity: RideActivity

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(activity.name)
                    .font(.headline)
                Text("\(activity.activityType) | \(oneDecimal(activity.distanceKm)) km")
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

private func oneDecimal(_ value: Double) -> String {
    value.formatted(.number.precision(.fractionLength(1)))
}

private struct PhotoTimelineView: View {
    let photos: [ActivityPhoto]

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 12) {
                ForEach(photos) { photo in
                    VStack(alignment: .leading, spacing: 6) {
                        TimelineImageView(imagePath: photo.imagePath)
                            .frame(width: 160, height: 110)
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        Text(photo.createdAt.formatted(date: .abbreviated, time: .shortened))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }
}

private struct TimelineImageView: View {
    let imagePath: String

    var body: some View {
#if os(iOS)
        if let image = UIImage(contentsOfFile: imagePath) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
        } else {
            placeholder
        }
#elseif os(macOS)
        if let image = NSImage(contentsOfFile: imagePath) {
            Image(nsImage: image)
                .resizable()
                .scaledToFill()
        } else {
            placeholder
        }
#else
        placeholder
#endif
    }

    private var placeholder: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Color.secondary.opacity(0.2))
            .overlay(Image(systemName: "photo"))
    }
}

private struct ElevationMiniChart: View {
    let points: [RoutePoint]

    var elevationValues: [Double] {
        points.compactMap { $0.elevationM }
    }

    var body: some View {
        GeometryReader { geometry in
            let values = elevationValues
            let minValue = values.min() ?? 0
            let maxValue = values.max() ?? 1
            let range = max(maxValue - minValue, 1)

            Path { path in
                guard !values.isEmpty else { return }

                for (index, value) in values.enumerated() {
                    let x = geometry.size.width * CGFloat(index) / CGFloat(max(values.count - 1, 1))
                    let yRatio = (value - minValue) / range
                    let y = geometry.size.height * (1 - CGFloat(yRatio))

                    if index == 0 {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }
            }
            .stroke(Color.accentColor, lineWidth: 2)
        }
    }
}

private struct ParsedRoutePoint {
    let latitude: Double
    let longitude: Double
    let elevationM: Double?
    let timestamp: Date?
}

private struct ParsedActivityFile {
    let name: String?
    let startTime: Date?
    let endTime: Date?
    let distanceKm: Double
    let durationMinutes: Double
    let avgSpeedKmh: Double
    let maxSpeedKmh: Double
    let elevationGainM: Double
    let routePoints: [ParsedRoutePoint]
}

private enum ImportParseError: LocalizedError {
    case unsupportedFormat
    case unreadableFile

    var errorDescription: String? {
        switch self {
        case .unsupportedFormat:
            return "Unsupported format. Use GPX, TCX, KML, GeoJSON, JSON or CSV."
        case .unreadableFile:
            return "Could not read file content."
        }
    }
}

private enum FileActivityParser {
    static func parse(url: URL) throws -> ParsedActivityFile {
        let data = try Data(contentsOf: url)
        guard let text = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1) else {
            throw ImportParseError.unreadableFile
        }

        let ext = url.pathExtension.lowercased()
        let routePoints: [ParsedRoutePoint]

        switch ext {
        case "gpx":
            routePoints = parseGPX(text)
        case "tcx":
            routePoints = parseTCX(text)
        case "kml":
            routePoints = parseKML(text)
        case "geojson", "json":
            routePoints = parseGeoJSON(data: data) ?? parseCSV(text)
        case "csv", "txt":
            routePoints = parseCSV(text)
        case "xml":
            routePoints = parseGPX(text).isEmpty ? parseTCX(text) : parseGPX(text)
        default:
            throw ImportParseError.unsupportedFormat
        }

        let ordered = routePoints
        let start = ordered.first?.timestamp
        let end = ordered.last?.timestamp
        let durationMinutes = {
            if let start, let end {
                return max(0, end.timeIntervalSince(start) / 60.0)
            }
            return extractNumber(keys: ["duration_minutes", "duration", "minutes"], from: text) ?? 0
        }()

        let distanceKm = extractNumber(keys: ["distance_km", "distance", "km"], from: text) ?? estimateDistanceKm(points: ordered)
        let elevationGain = estimateElevationGain(points: ordered)
        let avgSpeed = durationMinutes > 0 ? distanceKm / (durationMinutes / 60.0) : 0

        return ParsedActivityFile(
            name: extractName(from: text),
            startTime: start,
            endTime: end,
            distanceKm: distanceKm,
            durationMinutes: durationMinutes,
            avgSpeedKmh: avgSpeed,
            maxSpeedKmh: 0,
            elevationGainM: elevationGain,
            routePoints: ordered
        )
    }

    private static func parseGeoJSON(data: Data) -> [ParsedRoutePoint]? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }

        var coordinates: [[Double]] = []

        if let type = json["type"] as? String, type == "FeatureCollection",
           let features = json["features"] as? [[String: Any]] {
            for feature in features {
                guard let geometry = feature["geometry"] as? [String: Any],
                      let geometryType = geometry["type"] as? String else { continue }

                if geometryType == "LineString", let coords = geometry["coordinates"] as? [[Double]] {
                    coordinates.append(contentsOf: coords)
                }
            }
        } else if let type = json["type"] as? String, type == "LineString", let coords = json["coordinates"] as? [[Double]] {
            coordinates = coords
        }

        return coordinates.enumerated().compactMap { index, c in
            guard c.count >= 2 else { return nil }
            return ParsedRoutePoint(
                latitude: c[1],
                longitude: c[0],
                elevationM: c.count > 2 ? c[2] : nil,
                timestamp: nil
            )
        }
    }

    private static func parseGPX(_ text: String) -> [ParsedRoutePoint] {
        let pattern = #"<trkpt[^>]*lat=\"([\-0-9\.]+)\"[^>]*lon=\"([\-0-9\.]+)\"[^>]*>(.*?)</trkpt>"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators]) else {
            return []
        }

        let nsrange = NSRange(text.startIndex..., in: text)
        return regex.matches(in: text, range: nsrange).compactMap { match in
            guard let latRange = Range(match.range(at: 1), in: text),
                  let lonRange = Range(match.range(at: 2), in: text),
                  let bodyRange = Range(match.range(at: 3), in: text),
                  let lat = Double(text[latRange]),
                  let lon = Double(text[lonRange]) else {
                return nil
            }

            let body = String(text[bodyRange])
            let ele = extractFirstTagValue("ele", from: body).flatMap(Double.init)
            let time = extractFirstTagValue("time", from: body).flatMap(iso8601Date)

            return ParsedRoutePoint(latitude: lat, longitude: lon, elevationM: ele, timestamp: time)
        }
    }

    private static func parseTCX(_ text: String) -> [ParsedRoutePoint] {
        let pattern = #"<Trackpoint>(.*?)</Trackpoint>"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators]) else {
            return []
        }

        let nsrange = NSRange(text.startIndex..., in: text)
        return regex.matches(in: text, range: nsrange).compactMap { match in
            guard let blockRange = Range(match.range(at: 1), in: text) else { return nil }
            let block = String(text[blockRange])
            guard let lat = extractFirstTagValue("LatitudeDegrees", from: block).flatMap(Double.init),
                  let lon = extractFirstTagValue("LongitudeDegrees", from: block).flatMap(Double.init) else {
                return nil
            }

            let ele = extractFirstTagValue("AltitudeMeters", from: block).flatMap(Double.init)
            let time = extractFirstTagValue("Time", from: block).flatMap(iso8601Date)
            return ParsedRoutePoint(latitude: lat, longitude: lon, elevationM: ele, timestamp: time)
        }
    }

    private static func parseKML(_ text: String) -> [ParsedRoutePoint] {
        guard let coordinatesBlock = extractFirstTagValue("coordinates", from: text) else {
            return []
        }

        let chunks = coordinatesBlock
            .replacingOccurrences(of: "\n", with: " ")
            .split(separator: " ")
            .map(String.init)

        return chunks.compactMap { chunk in
            let parts = chunk.split(separator: ",").map(String.init)
            guard parts.count >= 2, let lon = Double(parts[0]), let lat = Double(parts[1]) else {
                return nil
            }
            let ele = parts.count > 2 ? Double(parts[2]) : nil
            return ParsedRoutePoint(latitude: lat, longitude: lon, elevationM: ele, timestamp: nil)
        }
    }

    private static func parseCSV(_ text: String) -> [ParsedRoutePoint] {
        let lines = text.components(separatedBy: .newlines).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        guard lines.count >= 2 else { return [] }

        let headers = lines[0].split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        let latIndex = headers.firstIndex(of: "lat") ?? headers.firstIndex(of: "latitude")
        let lonIndex = headers.firstIndex(of: "lon") ?? headers.firstIndex(of: "lng") ?? headers.firstIndex(of: "longitude")
        let eleIndex = headers.firstIndex(of: "ele") ?? headers.firstIndex(of: "elevation")
        let timeIndex = headers.firstIndex(of: "time") ?? headers.firstIndex(of: "timestamp")

        guard let latIndex, let lonIndex else { return [] }

        return lines.dropFirst().compactMap { line in
            let values = line.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            guard values.count > max(latIndex, lonIndex),
                  let lat = Double(values[latIndex]),
                  let lon = Double(values[lonIndex]) else {
                return nil
            }

            let ele: Double? = {
                guard let eleIndex, values.count > eleIndex else { return nil }
                return Double(values[eleIndex])
            }()

            let timestamp: Date? = {
                guard let timeIndex, values.count > timeIndex else { return nil }
                return iso8601Date(values[timeIndex])
            }()

            return ParsedRoutePoint(latitude: lat, longitude: lon, elevationM: ele, timestamp: timestamp)
        }
    }

    private static func extractName(from text: String) -> String? {
        extractFirstTagValue("name", from: text)
    }

    private static func extractNumber(keys: [String], from text: String) -> Double? {
        for key in keys {
            let pattern = "\\\"\(key)\\\"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)"
            if let regex = try? NSRegularExpression(pattern: pattern),
               let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
               let range = Range(match.range(at: 1), in: text) {
                return Double(text[range])
            }
        }
        return nil
    }

    private static func estimateDistanceKm(points: [ParsedRoutePoint]) -> Double {
        guard points.count > 1 else { return 0 }
        var meters: CLLocationDistance = 0
        for index in 1..<points.count {
            let p0 = points[index - 1]
            let p1 = points[index]
            meters += CLLocation(latitude: p0.latitude, longitude: p0.longitude)
                .distance(from: CLLocation(latitude: p1.latitude, longitude: p1.longitude))
        }
        return meters / 1000.0
    }

    private static func estimateElevationGain(points: [ParsedRoutePoint]) -> Double {
        guard points.count > 1 else { return 0 }
        var gain = 0.0
        for index in 1..<points.count {
            guard let prev = points[index - 1].elevationM,
                  let current = points[index].elevationM else {
                continue
            }
            if current > prev {
                gain += current - prev
            }
        }
        return gain
    }

    private static func extractFirstTagValue(_ tag: String, from text: String) -> String? {
        let pattern = #"<\#(tag)>(.*?)</\#(tag)>"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators]),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(match.range(at: 1), in: text) else {
            return nil
        }

        return String(text[range]).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    nonisolated private static func iso8601Date(_ value: String) -> Date? {
        ISO8601DateFormatter().date(from: value)
    }
}

private enum ImageStorage {
    static func saveImageData(_ data: Data) -> String? {
        let directory = documentsDirectory().appendingPathComponent("activity_photos", isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let filename = UUID().uuidString + ".jpg"
            let fileURL = directory.appendingPathComponent(filename)
            try data.write(to: fileURL)
            return fileURL.path
        } catch {
            return nil
        }
    }

    private static func documentsDirectory() -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
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
            modelContext.insert(
                HealthMeasurementRecord(
                    measurementType: measurement.measurementType,
                    value: measurement.value,
                    unit: measurement.unit,
                    recordedAt: .now,
                    activity: activity
                )
            )
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

#if canImport(MapKit)
private struct RouteMapView: View {
    let points: [RoutePoint]
    @State private var position: MapCameraPosition = .automatic

    var body: some View {
        let sorted = points.sorted { $0.sequence < $1.sequence }
        let coordinates = sorted.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) }

        Map(position: $position) {
            if coordinates.count > 1 {
                MapPolyline(coordinates: coordinates)
                    .stroke(Color.accentColor, lineWidth: 4)
            }

            if let start = coordinates.first {
                Marker("Start", coordinate: start)
                    .tint(.green)
            }

            if let end = coordinates.last {
                Marker("End", coordinate: end)
                    .tint(.red)
            }
        }
    }
}

private struct AllRoutesMapView: View {
    let activities: [RideActivity]
    @State private var position: MapCameraPosition = .automatic

    var body: some View {
        let routes = activities.compactMap { activity in
            let coordinates = activity.routePoints
                .sorted { $0.sequence < $1.sequence }
                .map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) }
            return coordinates.count > 1 ? coordinates : nil
        }

        Map(position: $position) {
            ForEach(Array(routes.enumerated()), id: \.offset) { index, route in
                MapPolyline(coordinates: route)
                    .stroke(routeColor(index: index), lineWidth: 3)
            }
        }
    }

    private func routeColor(index: Int) -> Color {
        let palette: [Color] = [.blue, .green, .orange, .pink, .teal, .purple, .mint]
        return palette[index % palette.count]
    }
}
#else
private struct RouteMapView: View {
    let points: [RoutePoint]
    var body: some View {
        Text("Map not supported on this platform")
            .foregroundStyle(.secondary)
    }
}

private struct AllRoutesMapView: View {
    let activities: [RideActivity]
    var body: some View {
        Text("Map not supported on this platform")
            .foregroundStyle(.secondary)
    }
}
#endif

#Preview {
    ContentView()
        .modelContainer(
            for: [RideActivity.self, HealthMeasurementRecord.self, Bike.self, HealthSource.self, RoutePoint.self, ActivityPhoto.self],
            inMemory: true
        )
}
