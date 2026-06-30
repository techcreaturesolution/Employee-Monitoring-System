import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Production: deployed Render backend URL
  // Development (Android emulator): use 'http://10.0.2.2:5000/api'
  // Development (physical device): use 'http://<YOUR_LOCAL_IP>:5000/api'
  static const String baseUrl = 'https://employee-monitoring-system-z5kk.onrender.com/api';
  static const _storage = FlutterSecureStorage();

  String? _token;

  Future<void> setToken(String token) async {
    _token = token;
    await _storage.write(key: 'auth_token', value: token);
  }

  Future<String?> getToken() async {
    _token ??= await _storage.read(key: 'auth_token');
    return _token;
  }

  Future<void> clearToken() async {
    _token = null;
    await _storage.delete(key: 'auth_token');
  }

  Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> _handleResponse(http.Response response) async {
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }
    throw ApiException(
      statusCode: response.statusCode,
      message: body['message']?.toString() ?? 'Request failed',
    );
  }

  Future<bool> tryRestoreToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  // Auth
  Future<Map<String, dynamic>> mobileLogin(
      String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/mobile/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    return _handleResponse(response);
  }

  // Punch
  Future<Map<String, dynamic>> punchIn({
    double? latitude,
    double? longitude,
    double? accuracy,
    String? address,
    String? workMode,
  }) async {
    final body = <String, dynamic>{};
    if (latitude != null) body['latitude'] = latitude;
    if (longitude != null) body['longitude'] = longitude;
    if (accuracy != null) body['accuracy'] = accuracy;
    if (address != null) body['address'] = address;
    if (workMode != null) body['workMode'] = workMode;

    final response = await http.post(
      Uri.parse('$baseUrl/mobile/punch-in'),
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> punchOut({
    double? latitude,
    double? longitude,
    double? accuracy,
    String? address,
  }) async {
    final body = <String, dynamic>{};
    if (latitude != null) body['latitude'] = latitude;
    if (longitude != null) body['longitude'] = longitude;
    if (accuracy != null) body['accuracy'] = accuracy;
    if (address != null) body['address'] = address;

    final response = await http.post(
      Uri.parse('$baseUrl/mobile/punch-out'),
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  // Work mode
  Future<Map<String, dynamic>> updateWorkMode(String workMode) async {
    final response = await http.put(
      Uri.parse('$baseUrl/mobile/work-mode'),
      headers: _headers(),
      body: jsonEncode({'workMode': workMode}),
    );
    return _handleResponse(response);
  }

  // Config
  Future<Map<String, dynamic>> getConfig() async {
    final response = await http.get(
      Uri.parse('$baseUrl/mobile/config'),
      headers: _headers(),
    );
    return _handleResponse(response);
  }

  // Dashboard
  Future<Map<String, dynamic>> getDashboard() async {
    final response = await http.get(
      Uri.parse('$baseUrl/mobile/dashboard'),
      headers: _headers(),
    );
    return _handleResponse(response);
  }

  // Profile (for token restore)
  Future<Map<String, dynamic>> getProfile() async {
    final response = await http.get(
      Uri.parse('${baseUrl.replaceAll('/mobile', '')}/auth/profile'),
      headers: _headers(),
    );
    return _handleResponse(response);
  }

  // Location tracking
  Future<Map<String, dynamic>> trackLocation({
    required double latitude,
    required double longitude,
    double? accuracy,
    String? address,
    double? batteryLevel,
    String? networkType,
  }) async {
    final body = <String, dynamic>{
      'latitude': latitude,
      'longitude': longitude,
      'source': 'mobile',
    };
    if (accuracy != null) body['accuracy'] = accuracy;
    if (address != null) body['address'] = address;
    if (batteryLevel != null) body['batteryLevel'] = batteryLevel;
    if (networkType != null) body['networkType'] = networkType;

    final response = await http.post(
      Uri.parse('$baseUrl/location/track'),
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> batchTrackLocations(
      List<Map<String, dynamic>> locations) async {
    final response = await http.post(
      Uri.parse('$baseUrl/location/batch'),
      headers: _headers(),
      body: jsonEncode({'locations': locations}),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> checkGeofence({
    required double latitude,
    required double longitude,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/location/geofence-check'),
      headers: _headers(),
      body: jsonEncode({'latitude': latitude, 'longitude': longitude}),
    );
    return _handleResponse(response);
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException({required this.statusCode, required this.message});

  @override
  String toString() => message;
}
