import lwc from '@lwc/rollup-plugin';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import { nodeResolve as resolveSubdirectoryImports } from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import serve from 'rollup-plugin-serve';
import { terser } from 'rollup-plugin-terser';
import livereload from 'rollup-plugin-livereload';
import del from 'rollup-plugin-delete';


const production = (process.env.NODE_ENV === 'production');
const watching = Boolean(process.env.ROLLUP_WATCH);

export default {
    input: 'src/index.js',
    output: {
        sourcemap: watching,
        dir: 'dist',
        format: 'esm',
    },
    preserveEntrySignatures: false,
    watch: {
        clearScreen: false,
        buildDelay: 2000,
        include: 'src/**'
    },
    plugins: [
        del({ targets: 'dist/*', runOnce: true }),
        resolveSubdirectoryImports(),
        lwc({ sourcemap: watching, exclude: '**/*.json' }),
        json(),
        replace({ 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV), 'preventAssignment': true }),
        copy({
            targets: [
                { src: 'src/index.html', dest: 'dist' },
                { src: 'src/favicon.ico', dest: 'dist/assets/icons' },
                { src: 'node_modules/@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css', dest: 'dist/assets/styles' },
            ],
            copyOnce: true
        }),
        production && terser(),
        watching && serve('dist'),
        watching && livereload({ watch: 'dist', delay: 400 })
    ].filter(Boolean)
};