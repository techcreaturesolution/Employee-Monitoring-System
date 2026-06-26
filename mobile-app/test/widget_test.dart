import 'package:flutter_test/flutter_test.dart';
import 'package:ems_mobile/main.dart';

void main() {
  testWidgets('App loads', (WidgetTester tester) async {
    await tester.pumpWidget(const EMSApp());
    expect(find.text('Employee Monitor'), findsOneWidget);
  });
}
