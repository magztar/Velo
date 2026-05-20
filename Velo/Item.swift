//
//  Item.swift
//  Velo
//
//  Created by Magnus Larsson on 2026-05-20.
//

import Foundation
import SwiftData

@Model
final class RideActivity {
    var name: String
    var activityType: String
    var startedAt: Date
    var endedAt: Date?
    var source: String
    var distanceKm: Double
    var durationMinutes: Double
    var avgSpeedKmh: Double
    var maxSpeedKmh: Double
    var elevationGainM: Double
    var note: String
    var bikeName: String
    var isFavorite: Bool

    @Relationship(deleteRule: .cascade, inverse: \HealthMeasurementRecord.activity)
    var measurements: [HealthMeasurementRecord]

    @Relationship(deleteRule: .cascade, inverse: \RoutePoint.activity)
    var routePoints: [RoutePoint]

    @Relationship(deleteRule: .cascade, inverse: \ActivityPhoto.activity)
    var photos: [ActivityPhoto]

    init(
        name: String = "Ny aktivitet",
        activityType: String = "cycling",
        startedAt: Date = .now,
        endedAt: Date? = nil,
        source: String = "manual",
        distanceKm: Double = 0,
        durationMinutes: Double = 0,
        avgSpeedKmh: Double = 0,
        maxSpeedKmh: Double = 0,
        elevationGainM: Double = 0,
        note: String = "",
        bikeName: String = "",
        isFavorite: Bool = false
    ) {
        self.name = name
        self.activityType = activityType
        self.startedAt = startedAt
        self.endedAt = endedAt
        self.source = source
        self.distanceKm = distanceKm
        self.durationMinutes = durationMinutes
        self.avgSpeedKmh = avgSpeedKmh
        self.maxSpeedKmh = maxSpeedKmh
        self.elevationGainM = elevationGainM
        self.note = note
        self.bikeName = bikeName
        self.isFavorite = isFavorite
        self.measurements = []
        self.routePoints = []
        self.photos = []
    }
}

@Model
final class HealthMeasurementRecord {
    var measurementType: String
    var value: Double
    var unit: String
    var recordedAt: Date
    var activity: RideActivity?

    init(
        measurementType: String,
        value: Double,
        unit: String,
        recordedAt: Date = .now,
        activity: RideActivity? = nil
    ) {
        self.measurementType = measurementType
        self.value = value
        self.unit = unit
        self.recordedAt = recordedAt
        self.activity = activity
    }
}

@Model
final class Bike {
    var name: String
    var brand: String
    var model: String
    var bikeType: String
    var isEBike: Bool
    var displayType: String
    var motorType: String
    var totalDistanceKm: Double
    var totalActivities: Int
    var createdAt: Date

    init(
        name: String,
        brand: String = "",
        model: String = "",
        bikeType: String = "ebike",
        isEBike: Bool = false,
        displayType: String = "",
        motorType: String = "",
        totalDistanceKm: Double = 0,
        totalActivities: Int = 0,
        createdAt: Date = .now
    ) {
        self.name = name
        self.brand = brand
        self.model = model
        self.bikeType = bikeType
        self.isEBike = isEBike
        self.displayType = displayType
        self.motorType = motorType
        self.totalDistanceKm = totalDistanceKm
        self.totalActivities = totalActivities
        self.createdAt = createdAt
    }
}

@Model
final class HealthSource {
    var platform: String
    var sourceName: String
    var isConnected: Bool
    var createdAt: Date

    init(platform: String, sourceName: String, isConnected: Bool = true, createdAt: Date = .now) {
        self.platform = platform
        self.sourceName = sourceName
        self.isConnected = isConnected
        self.createdAt = createdAt
    }
}

@Model
final class RoutePoint {
    var sequence: Int
    var latitude: Double
    var longitude: Double
    var elevationM: Double?
    var timestamp: Date?
    var activity: RideActivity?

    init(
        sequence: Int,
        latitude: Double,
        longitude: Double,
        elevationM: Double? = nil,
        timestamp: Date? = nil,
        activity: RideActivity? = nil
    ) {
        self.sequence = sequence
        self.latitude = latitude
        self.longitude = longitude
        self.elevationM = elevationM
        self.timestamp = timestamp
        self.activity = activity
    }
}

@Model
final class ActivityPhoto {
    var imagePath: String
    var caption: String
    var createdAt: Date
    var activity: RideActivity?

    init(imagePath: String, caption: String = "", createdAt: Date = .now, activity: RideActivity? = nil) {
        self.imagePath = imagePath
        self.caption = caption
        self.createdAt = createdAt
        self.activity = activity
    }
}
