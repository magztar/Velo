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
    var startedAt: Date
    var source: String

    @Relationship(deleteRule: .cascade, inverse: \HealthMeasurementRecord.activity)
    var measurements: [HealthMeasurementRecord]

    init(startedAt: Date = .now, source: String = "HealthKit") {
        self.startedAt = startedAt
        self.source = source
        self.measurements = []
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
