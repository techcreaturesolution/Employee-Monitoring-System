class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String tenantId;
  final String department;
  final String designation;
  final String workMode;
  final String avatar;
  final String phone;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.tenantId,
    this.department = '',
    this.designation = '',
    this.workMode = 'office',
    this.avatar = '',
    this.phone = '',
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      tenantId: json['tenantId']?.toString() ?? '',
      department: json['department']?.toString() ?? '',
      designation: json['designation']?.toString() ?? '',
      workMode: json['workMode']?.toString() ?? 'office',
      avatar: json['avatar']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
    );
  }

  User copyWith({String? workMode}) {
    return User(
      id: id,
      name: name,
      email: email,
      role: role,
      tenantId: tenantId,
      department: department,
      designation: designation,
      workMode: workMode ?? this.workMode,
      avatar: avatar,
      phone: phone,
    );
  }
}
