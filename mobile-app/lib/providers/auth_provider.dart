import 'package:flutter/material.dart';
import '../models/user.dart';
import '../models/tenant_config.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService api;
  User? _user;
  TenantConfig? _tenant;
  bool _loading = false;

  AuthProvider({required this.api}) {
    _tryRestoreSession();
  }

  User? get user => _user;
  TenantConfig? get tenant => _tenant;
  bool get loading => _loading;
  bool get isAuthenticated => _user != null;

  Future<void> _tryRestoreSession() async {
    _loading = true;
    notifyListeners();

    try {
      final hasToken = await api.tryRestoreToken();
      if (!hasToken) {
        _loading = false;
        notifyListeners();
        return;
      }

      final result = await api.getProfile();
      final data = result['data'] as Map<String, dynamic>;
      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      _tenant = data['tenant'] != null
          ? TenantConfig.fromJson(data['tenant'] as Map<String, dynamic>)
          : null;
    } catch (_) {
      await api.clearToken();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    _loading = true;
    notifyListeners();

    try {
      final result = await api.mobileLogin(email, password);
      final data = result['data'] as Map<String, dynamic>;

      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      _tenant = data['tenant'] != null
          ? TenantConfig.fromJson(data['tenant'] as Map<String, dynamic>)
          : null;

      final token = data['accessToken']?.toString() ?? '';
      await api.setToken(token);

      _loading = false;
      notifyListeners();
    } catch (e) {
      _loading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> updateWorkMode(String mode) async {
    await api.updateWorkMode(mode);
    if (_user != null) {
      _user = _user!.copyWith(workMode: mode);
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _user = null;
    _tenant = null;
    await api.clearToken();
    notifyListeners();
  }
}
