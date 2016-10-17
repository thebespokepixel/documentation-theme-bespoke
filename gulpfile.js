/* ────────────────╮
 │ Theme assembler │
 ╰─────────────────┴────────────────────────────────────────────────────────────*/

const gulp = require('gulp')
const cordial = require('@thebespokepixel/cordial')()
const palette2oco = require('@thebespokepixel/palette2oco')
const stylus = require('gulp-stylus')
const nib = require('nib')

// clean using trash
gulp.task('clean', cordial.shell({
	source: ['./assets', './parts', './src/vars.styl']
}).trash())

// transpilation/formatting
gulp.task('build', cordial.transpile({
	source: 'src/index.js'
}).rollup.babel({
	dest: './index.js'
}))

gulp.task('master', cordial.format({
	source: 'src/index.js'
}).rollup.babel({
	dest: './index.js'
}))

gulp.task('css-build', () => palette2oco.paletteReader(`src`)
	.load(['src/palette.oco'])
	.then(palette2oco.oco2Vars)
	.then(palette => palette2oco.paletteWriter('src/vars.styl', palette))
	.then(() => gulp.src('./src/style.styl')
		.pipe(stylus({
			'include css': true,
			'compress': true,
			'use': [nib()]
		}))
		.pipe(gulp.dest('./assets/css'))
	)
)

// Filesystem
gulp.task('assets', gulp.parallel(
	cordial.shell({source: 'src/parts'}).copy(),
	cordial.shell({source: 'src/assets'}).copy()
))

gulp.task('fonts', gulp.parallel(
	cordial.shell({
		source: [
			'node_modules/typopro-web/web/TypoPRO-Hack',
			'node_modules/typopro-web/web/TypoPRO-FiraSans'
		],
		dest: './assets/fonts/'
	}).copy()
))

gulp.task('js', gulp.parallel(
	cordial.shell({
		source: [
			'node_modules/anchor-js/anchor.min.js'
		],
		dest: './assets/js/'
	}).copy()
))

gulp.task('css', gulp.parallel(
	cordial.shell({
		source: [
			'node_modules/ace-css/css/ace.min.css'
		],
		dest: './assets/css/'
	}).copy()
))

// Tests
gulp.task('ava', cordial.test().ava(['test/*.js']))
gulp.task('xo', cordial.test().xo(['src/*.js']))
gulp.task('test', gulp.parallel('xo', 'ava'))

gulp.task('full', gulp.series('assets', 'fonts', 'css-build', 'css', 'js'))

// Hooks
gulp.task('start-release', gulp.series('reset', 'clean', 'full', 'master'))

// Default
gulp.task('default', gulp.series('bump', 'clean', 'full', 'build'))
