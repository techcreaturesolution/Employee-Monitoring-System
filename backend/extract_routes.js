const fs = require('fs');
const path = require('path');

const modulesDir = 'e:/Tech Creature solution/EMS/Employee-Monitoring-System/backend/src/modules';
const dirs = fs.readdirSync(modulesDir);

let output = {};

dirs.forEach(dir => {
    const routeFile = path.join(modulesDir, dir, `${dir}.routes.ts`);
    const valFile = path.join(modulesDir, dir, `${dir}.validation.ts`);
    
    if (fs.existsSync(routeFile)) {
        const content = fs.readFileSync(routeFile, 'utf8');
        output[dir] = { routes: [] };
        
        // This regex tries to capture router.method(...)
        // It's basic and might miss multi-line
        const statements = content.split('router.').slice(1);
        
        statements.forEach(stmt => {
            const methodMatch = stmt.match(/^(get|post|put|delete|patch)\(([\s\S]*?)\);/);
            if (methodMatch) {
                const method = methodMatch[1];
                const argsStr = methodMatch[2];
                
                // Extract path
                const pathMatch = argsStr.match(/^['"`]([^'"`]+)['"`]/);
                const routePath = pathMatch ? pathMatch[1] : '';
                
                // Extract authorize
                let roles = [];
                const authMatch = argsStr.match(/authorize\(([^)]+)\)/);
                if (authMatch) {
                    roles = authMatch[1].split(',').map(s => s.trim().replace(/['"`]/g, ''));
                }
                
                // Extract validate
                let validationSchema = '';
                const valMatch = argsStr.match(/validate\(([^),]+)/);
                if (valMatch) {
                    validationSchema = valMatch[1].trim();
                }
                
                output[dir].routes.push({
                    method,
                    path: routePath,
                    roles: roles.length ? roles : 'Any Authenticated / Public',
                    schema: validationSchema
                });
            }
        });
        
        if (fs.existsSync(valFile)) {
            const valContent = fs.readFileSync(valFile, 'utf8');
            // extract schema objects roughly
            const schemaMatch = valContent.match(/export const \w+ = Joi\.object\({[\s\S]*?}\);/g);
            output[dir].validations = schemaMatch ? schemaMatch : ["Validation exists but not extracted"];
        }
    }
});

fs.writeFileSync('e:/Tech Creature solution/EMS/Employee-Monitoring-System/backend/routes_summary.json', JSON.stringify(output, null, 2));
console.log('Summary created at backend/routes_summary.json');
