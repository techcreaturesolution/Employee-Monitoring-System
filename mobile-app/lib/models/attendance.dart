class PunchRecord {
  final DateTime? time;
  final String ip;
  final double latitude;
  final double longitude;
  final String address;
  final double accuracy;
  final String method;
  final bool isInsideGeofence;

  PunchRecord({
    this.time,
    this.ip = '',
    this.latitude = 0,
    this.longitude = 0,
    this.address = '',
    this.accuracy = 0,
    this.method = '',
    this.isInsideGeofence = false,
  });

  factory PunchRecord.fromJson(Map<String, dynamic>? json) {
    if (json == null) return PunchRecord();
    final location = json['location'] as Map<String, dynamic>? ?? {};
    return PunchRecord(
      time: json['time'] != null ? DateTime.tryParse(json['time'].toString()) : null,
      ip: json['ip']?.toString() ?? '',
      latitude: (location['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (location['longitude'] as num?)?.toDouble() ?? 0,
      address: location['address']?.toString() ?? '',
      accuracy: (location['accuracy'] as num?)?.toDouble() ?? 0,
      method: json['method']?.toString() ?? '',
      isInsideGeofence: json['isInsideGeofence'] == true,
    );
  }
}

class TodayAttendance {
  final PunchRecord? punchIn;
  final PunchRecord? punchOut;
  final String workMode;
  final int totalWorkMinutes;
  final int totalBreakMinutes;
  final String status;

  TodayAttendance({
    this.punchIn,
    this.punchOut,
    this.workMode = 'office',
    this.totalWorkMinutes = 0,
    this.totalBreakMinutes = 0,
    this.status = '',
  });

  factory TodayAttendance.fromJson(Map<String, dynamic>? json) {
    if (json == null) return TodayAttendance();
    return TodayAttendance(
      punchIn: json['punchIn'] != null
          ? PunchRecord.fromJson(json['punchIn'] as Map<String, dynamic>)
          : null,
      punchOut: json['punchOut'] != null
          ? PunchRecord.fromJson(json['punchOut'] as Map<String, dynamic>)
          : null,
      workMode: json['workMode']?.toString() ?? 'office',
      totalWorkMinutes: (json['totalWorkMinutes'] as num?)?.toInt() ?? 0,
      totalBreakMinutes: (json['totalBreakMinutes'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? '',
    );
  }

  bool get isPunchedIn => punchIn?.time != null && punchOut?.time == null;
  bool get isDayComplete => punchIn?.time != null && punchOut?.time != null;
}
