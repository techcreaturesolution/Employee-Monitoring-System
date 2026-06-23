import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../models/attendance.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final ApiService _api;
  late final LocationService _locationService;
  TodayAttendance? _attendance;
  bool _loading = true;
  bool _punching = false;
  bool _isTracking = false;
  int _locationUpdates = 0;
  String _currentAddress = 'Fetching location...';
  bool? _geofenceStatus;

  @override
  void initState() {
    super.initState();
    _api = context.read<AuthProvider>().api;
    _locationService = LocationService(_api);
    _fetchDashboard();
    _fetchCurrentLocation();
  }

  @override
  void dispose() {
    _locationService.dispose();
    super.dispose();
  }

  Future<void> _fetchDashboard() async {
    try {
      final result = await _api.getDashboard();
      final data = result['data'] as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _attendance = TodayAttendance.fromJson(
            data['todayAttendance'] as Map<String, dynamic>?);
        _locationUpdates = (data['locationUpdates'] as num?)?.toInt() ?? 0;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchCurrentLocation() async {
    final position = await _locationService.getCurrentPosition();
    if (position != null && mounted) {
      final addr =
          await _locationService.reverseGeocode(position.latitude, position.longitude);
      setState(() => _currentAddress = addr);

      final result = await _locationService.sendSingleLocation(position);
      if (result != null && mounted) {
        setState(() {
          _geofenceStatus = result['isInsideGeofence'] == true;
        });
      }
    } else if (mounted) {
      setState(() => _currentAddress = 'Location unavailable');
    }
  }

  Future<void> _handlePunchIn() async {
    final auth = context.read<AuthProvider>();
    setState(() => _punching = true);
    try {
      final position = await _locationService.getCurrentPosition();
      String address = '';
      if (position != null) {
        address = await _locationService.reverseGeocode(
            position.latitude, position.longitude);
      }

      await _api.punchIn(
        latitude: position?.latitude,
        longitude: position?.longitude,
        accuracy: position?.accuracy,
        address: address,
        workMode: auth.user?.workMode,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Punched In successfully!'),
          backgroundColor: Colors.green,
        ),
      );

      final interval = auth.tenant?.mobileLocationInterval ?? 15;
      _locationService.startTracking(intervalMinutes: interval);
      setState(() => _isTracking = true);

      _fetchDashboard();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: Colors.red),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Punch in failed: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _punching = false);
    }
  }

  Future<void> _handlePunchOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm'),
        content: const Text('Are you sure you want to punch out?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Punch Out'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _punching = true);
    try {
      final position = await _locationService.getCurrentPosition();
      String address = '';
      if (position != null) {
        address = await _locationService.reverseGeocode(
            position.latitude, position.longitude);
      }

      await _api.punchOut(
        latitude: position?.latitude,
        longitude: position?.longitude,
        accuracy: position?.accuracy,
        address: address,
      );

      _locationService.stopTracking();
      if (!mounted) return;
      setState(() => _isTracking = false);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Punched Out successfully!'),
          backgroundColor: Colors.green,
        ),
      );

      _fetchDashboard();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: Colors.red),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Punch out failed: $e'),
            backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _punching = false);
    }
  }

  void _handleWorkModeChange(String mode) async {
    final modeLabels = {
      'office': 'Office',
      'wfh': 'Work From Home',
      'field': 'Field Work'
    };

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Work Mode'),
        content: Text('Switch to ${modeLabels[mode]}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirm')),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      // ignore: use_build_context_synchronously
      await context.read<AuthProvider>().updateWorkMode(mode);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Work mode changed to ${modeLabels[mode]}'),
          backgroundColor: Colors.blue,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Failed to update work mode'),
            backgroundColor: Colors.red),
      );
    }
  }

  String _formatTime(DateTime? time) {
    if (time == null) return '-';
    return DateFormat('hh:mm a').format(time.toLocal());
  }

  String _formatMinutes(int mins) {
    final h = mins ~/ 60;
    final m = mins % 60;
    return '${h}h ${m}m';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final currentMode = user?.workMode ?? 'office';

    final modeConfig = <String, Map<String, dynamic>>{
      'office': {
        'label': 'Office',
        'color': const Color(0xFF1E40AF),
        'bg': const Color(0xFFDBEAFE),
        'icon': Icons.business,
      },
      'wfh': {
        'label': 'Work From Home',
        'color': const Color(0xFF15803D),
        'bg': const Color(0xFFDCFCE7),
        'icon': Icons.home,
      },
      'field': {
        'label': 'Field Work',
        'color': const Color(0xFFC2410C),
        'bg': const Color(0xFFFFEDD5),
        'icon': Icons.explore,
      },
    };

    final mode = modeConfig[currentMode] ?? modeConfig['office']!;

    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([_fetchDashboard(), _fetchCurrentLocation()]);
        },
        child: ListView(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              decoration: const BoxDecoration(
                color: Color(0xFF1E40AF),
              ),
              child: SafeArea(
                bottom: false,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, ${user?.name ?? ""}',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.designation.isNotEmpty == true
                              ? user!.designation
                              : user?.department.isNotEmpty == true
                                  ? user!.department
                                  : user?.role ?? '',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF93C5FD),
                          ),
                        ),
                      ],
                    ),
                    Material(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(8),
                        onTap: () => auth.logout(),
                        child: const Padding(
                          padding:
                              EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Text(
                            'Logout',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Work Mode Card
            Container(
              margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: mode['bg'] as Color,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CURRENT WORK MODE',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: (mode['color'] as Color).withValues(alpha: 0.7),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(mode['icon'] as IconData, color: mode['color'] as Color, size: 28),
                      const SizedBox(width: 8),
                      Text(
                        mode['label'] as String,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: mode['color'] as Color,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: ['office', 'wfh', 'field'].map((m) {
                      final isActive = currentMode == m;
                      final cfg = modeConfig[m]!;
                      return Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(
                              right: m != 'field' ? 8 : 0),
                          child: OutlinedButton(
                            onPressed: () => _handleWorkModeChange(m),
                            style: OutlinedButton.styleFrom(
                              backgroundColor: isActive
                                  ? cfg['color'] as Color
                                  : Colors.white,
                              foregroundColor: isActive
                                  ? Colors.white
                                  : const Color(0xFF64748B),
                              side: BorderSide(
                                color: isActive
                                    ? cfg['color'] as Color
                                    : const Color(0xFFE2E8F0),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding:
                                  const EdgeInsets.symmetric(vertical: 10),
                            ),
                            child: Text(
                              cfg['label'] as String,
                              style: const TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.w600),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),

            // Location Card
            _buildCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'CURRENT LOCATION',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on,
                          color: Colors.red, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _currentAddress,
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF334155),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_geofenceStatus != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _geofenceStatus!
                            ? const Color(0xFFDCFCE7)
                            : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _geofenceStatus!
                            ? 'Inside Office Geofence'
                            : 'Outside Office Geofence',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF334155),
                        ),
                      ),
                    ),
                  ],
                  if (_isTracking)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'Location tracking active - $_locationUpdates updates today',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Attendance Card
            _buildCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "TODAY'S ATTENDANCE",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildAttendanceRow(
                      'Punch In', _formatTime(_attendance?.punchIn?.time)),
                  _buildAttendanceRow(
                      'Punch Out', _formatTime(_attendance?.punchOut?.time)),
                  _buildAttendanceRow('Total Work',
                      _formatMinutes(_attendance?.totalWorkMinutes ?? 0)),
                  _buildStatusRow(
                      'Status', _attendance?.status ?? 'Not Punched In'),
                ],
              ),
            ),

            // Punch Button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
              child: _buildPunchSection(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _buildAttendanceRow(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style:
                  const TextStyle(fontSize: 14, color: Color(0xFF64748B))),
          Text(value,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B))),
        ],
      ),
    );
  }

  Widget _buildStatusRow(String label, String status) {
    Color bgColor;
    if (status == 'present') {
      bgColor = const Color(0xFFDCFCE7);
    } else if (status == 'late') {
      bgColor = const Color(0xFFFEF9C3);
    } else {
      bgColor = const Color(0xFFF1F5F9);
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style:
                  const TextStyle(fontSize: 14, color: Color(0xFF64748B))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              status.isEmpty ? 'Not Punched In' : status,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF334155),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPunchSection() {
    if (_attendance == null || _attendance!.punchIn?.time == null) {
      // Not punched in
      return SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton(
          onPressed: _punching ? null : _handlePunchIn,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF16A34A),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16)),
            elevation: 4,
          ),
          child: _punching
              ? const SizedBox(
                  height: 24,
                  width: 24,
                  child: CircularProgressIndicator(
                      strokeWidth: 2.5, color: Colors.white),
                )
              : const Text('Punch In',
                  style:
                      TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
      );
    } else if (_attendance!.isPunchedIn) {
      // Punched in, not out
      return SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton(
          onPressed: _punching ? null : _handlePunchOut,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFDC2626),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16)),
            elevation: 4,
          ),
          child: _punching
              ? const SizedBox(
                  height: 24,
                  width: 24,
                  child: CircularProgressIndicator(
                      strokeWidth: 2.5, color: Colors.white),
                )
              : const Text('Punch Out',
                  style:
                      TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
      );
    } else {
      // Day complete
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF4),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            const Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 36),
            const SizedBox(height: 8),
            const Text(
              'Work day completed',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF16A34A),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${_formatMinutes(_attendance?.totalWorkMinutes ?? 0)} worked today',
              style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
            ),
          ],
        ),
      );
    }
  }
}
