const fs = require('fs');
const files = [
  'src/pages/Employees.tsx',
  'src/pages/Attendance.tsx',
  'src/pages/Projects.tsx',
  'src/pages/ActivityPage.tsx',
  'src/pages/Screenshots.tsx',
  'src/pages/LocationTracker.tsx',
  'src/pages/SettingsPage.tsx',
  'src/pages/ReportsPage.tsx',
  'src/pages/Tasks.tsx',
  'src/pages/Managers.tsx'
];

const classMap = {
  'bg-white': 'bg-[#161b22]',
  'text-slate-800': 'text-white',
  'text-slate-900': 'text-white',
  'bg-slate-50': 'bg-[#0d1117]',
  'bg-gray-50': 'bg-[#0d1117]',
  'text-slate-500': 'text-slate-400',
  'text-slate-600': 'text-slate-300',
  'text-gray-500': 'text-slate-400',
  'text-gray-900': 'text-white',
  'text-gray-600': 'text-slate-300',
  'text-gray-700': 'text-slate-300',
  'border-b': 'border-b border-[#30363d]',
  'border-t': 'border-t border-[#30363d]',
  'border-r': 'border-r border-[#30363d]',
  'border-l': 'border-l border-[#30363d]',
  'border rounded': 'border border-[#30363d] rounded',
  'border-gray-200': 'border-[#30363d]',
  'border-slate-200': 'border-[#30363d]',
  'hover:bg-slate-50': 'hover:bg-[#21262d]',
  'hover:bg-gray-50': 'hover:bg-[#21262d]',
  'divide-y': 'divide-y divide-[#30363d]',
  'divide-gray-200': 'divide-[#30363d]',
  'ring-1 ring-black ring-opacity-5': 'border border-[#30363d]',
  'shadow-sm border': 'border border-[#30363d]',
  'bg-slate-100': 'bg-[#21262d]',
  'bg-gray-100': 'bg-[#21262d]',
  'bg-gray-50/50': 'bg-[#0d1117]'
};

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Quick wrapper injection
    content = content.replace(/return \(\s*<div>/g, 'return (\\n    <div className="bg-[#0d1117] min-h-screen text-white">');
    content = content.replace(/return \(\s*<div className="max-w-7xl/g, 'return (\\n    <div className="bg-[#0d1117] min-h-screen text-white max-w-7xl');
    content = content.replace(/return \(\s*<div className="space-y-6"/g, 'return (\\n    <div className="bg-[#0d1117] min-h-screen text-white space-y-6"');
    content = content.replace(/return \(\s*<div className="flex flex-col/g, 'return (\\n    <div className="bg-[#0d1117] min-h-screen text-white flex flex-col');
    
    for (const [oldCls, newCls] of Object.entries(classMap)) {
      const regex = new RegExp(oldCls.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g');
      content = content.replace(regex, newCls);
    }
    
    // Cleanup double classes
    content = content.replace(/border border-\\[#30363d\\] border-\\[#30363d\\]/g, 'border border-[#30363d]');
    content = content.replace(/border-\\[#30363d\\] border-\\[#30363d\\]/g, 'border-[#30363d]');
    
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
}
