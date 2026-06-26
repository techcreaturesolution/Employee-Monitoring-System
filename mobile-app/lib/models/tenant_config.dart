class OfficeLocation {
  final String name;
  final double latitude;
  final double longitude;
  final double radiusMeters;

  OfficeLocation({
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
  });

  factory OfficeLocation.fromJson(Map<String, dynamic> json) {
    return OfficeLocation(
      name: json['name']?.toString() ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      radiusMeters: (json['radiusMeters'] as num?)?.toDouble() ?? 200,
    );
  }
}

class TenantConfig {
  final String id;
  final String name;
  final String plan;
  final bool enableGeofencing;
  final List<OfficeLocation> officeLocations;
  final int mobileLocationInterval;
  final bool requireLocationForPunch;
  final String workStartTime;
  final String workEndTime;

  TenantConfig({
    required this.id,
    required this.name,
    required this.plan,
    this.enableGeofencing = false,
    this.officeLocations = const [],
    this.mobileLocationInterval = 15,
    this.requireLocationForPunch = false,
    this.workStartTime = '09:00',
    this.workEndTime = '18:00',
  });

  factory TenantConfig.fromJson(Map<String, dynamic> json) {
    final settings = json['settings'] as Map<String, dynamic>? ?? {};
    final locations = (settings['officeLocations'] as List?)
            ?.map((e) => OfficeLocation.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    return TenantConfig(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      plan: json['plan']?.toString() ?? '',
      enableGeofencing: settings['enableGeofencing'] == true,
      officeLocations: locations,
      mobileLocationInterval:
          (settings['mobileLocationInterval'] as num?)?.toInt() ?? 15,
      requireLocationForPunch: settings['requireLocationForPunch'] == true,
      workStartTime: settings['workStartTime']?.toString() ?? '09:00',
      workEndTime: settings['workEndTime']?.toString() ?? '18:00',
    );
  }
}
