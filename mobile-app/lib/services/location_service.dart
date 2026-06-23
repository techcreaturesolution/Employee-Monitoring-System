import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'api_service.dart';

class LocationService {
  final ApiService _api;
  StreamSubscription<Position>? _positionSubscription;
  final List<Map<String, dynamic>> _locationBuffer = [];
  Timer? _flushTimer;

  LocationService(this._api);

  Future<bool> requestPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }

    if (permission == LocationPermission.deniedForever) return false;

    return true;
  }

  Future<Position?> getCurrentPosition() async {
    try {
      final hasPermission = await requestPermission();
      if (!hasPermission) return null;

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      return null;
    }
  }

  Future<String> reverseGeocode(double latitude, double longitude) async {
    try {
      final placemarks = await placemarkFromCoordinates(latitude, longitude);
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final parts = [p.street, p.locality, p.administrativeArea]
            .where((s) => s != null && s.isNotEmpty)
            .toList();
        if (parts.isNotEmpty) return parts.join(', ');
      }
      return '${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}';
    } catch (_) {
      return '${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}';
    }
  }

  Future<Map<String, dynamic>?> sendSingleLocation(Position position) async {
    try {
      final result = await _api.trackLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      );
      return result['data'] as Map<String, dynamic>?;
    } catch (e) {
      return null;
    }
  }

  void startTracking({int intervalMinutes = 15}) {
    stopTracking();

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.low,
        distanceFilter: 50,
      ),
    ).listen((position) {
      _locationBuffer.add({
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      });

      if (_locationBuffer.length >= 5) {
        _flushBuffer();
      }
    });

    _flushTimer = Timer.periodic(
      Duration(minutes: intervalMinutes),
      (_) => _flushBuffer(),
    );
  }

  void stopTracking() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
    _flushTimer?.cancel();
    _flushTimer = null;
    _flushBuffer();
  }

  Future<void> _flushBuffer() async {
    if (_locationBuffer.isEmpty) return;
    final batch = List<Map<String, dynamic>>.from(_locationBuffer);
    _locationBuffer.clear();

    try {
      await _api.batchTrackLocations(batch);
    } catch (e) {
      // Re-add on failure for retry
      _locationBuffer.addAll(batch);
    }
  }

  void dispose() {
    stopTracking();
  }
}
