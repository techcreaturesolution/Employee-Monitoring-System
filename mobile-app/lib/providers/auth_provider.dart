import 'package:flutter/material.dart';
import '../models/user.dart';
import '../models/tenant_config.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService api;
  User? _user;
  TenantConfig? _tenant;
  bool _loading = false;

  AuthProvider({required this.api});

  User? get user => _user;
  TenantConfig? get tenant => _tenant;
  bool get loading => _loading;
  bool get isAuthenticated => _user != null;

  Future<void> login(String email, String password) async {
    _loading = true;
    notifyListeners();

    try {
      final result = await api.mobileLogin(email, password);
      final data = result['data'] as Map<String, dynamic>;

      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      _tenant = TenantConfig.fromJson(data['tenant'] as Map<String, dynamic>);

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
