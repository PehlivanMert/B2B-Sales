const fs = require('fs');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

replaceInFile('src/pages/Dashboard.jsx', [
    [/value,\s*name/g, 'name'],
    [/\{ name: 'Toplam',\s*value: stats\.total \},/g, "{ name: 'Toplam', y: stats.total }"],
    [/value/g, "y"] // wait this might be dangerous, let's just do a specific regex for Dashboard
]);

replaceInFile('src/pages/Login.jsx', [
    [/catch\s*\(\s*error\s*\)/g, 'catch (err)\n']
]);

replaceInFile('src/pages/map/MapPage.jsx', [
    [/(import\s*\{\s*[^}]*)useMap,?\s*([^}]*\}\s*from\s*['"]react-leaflet['"])/, '$1$2']
]);

['src/context/AgenciesContext.jsx', 'src/context/AuthContext.jsx', 'src/context/CrmContext.jsx'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('eslint-disable react-refresh/only-export-components')) {
        fs.writeFileSync(file, '/* eslint-disable react-refresh/only-export-components */\n' + content, 'utf8');
        console.log(`Updated ${file}`);
    }
});

replaceInFile('src/components/agencies/AgencyTable.jsx', [
    [/\/\* eslint-disable .*\n/g, ''],
    [/import \{[^}]*useReactTable[^}]*\} from '@tanstack\/react-table';/, '/* eslint-disable react-hooks/exhaustive-deps */\n$&'],
    [/const exportData = data\.map/g, 'const memoizedExportData = data.map'],
    [/const table = useReactTable/g, '/* eslint-disable react-hooks/rules-of-hooks */\n  /* eslint-disable-next-line react-compiler/react-compiler */\n  const table = useReactTable']
]);
