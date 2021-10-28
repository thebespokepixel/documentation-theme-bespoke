import gulp from 'gulp'
import rename from 'gulp-rename'
import clean from 'gulp-clean'
import terser from 'gulp-terser'
import source from 'vinyl-source-stream'
import rollup from '@rollup/stream'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import palette2oco from '@thebespokepixel/palette2oco'
import stylus from 'gulp-stylus'
import nib from 'nib'

const external = id => !id.startsWith('src') && !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0')

gulp.task('build', () =>
	rollup({
		input: 'src/index.js',
		external,
		plugins: [resolve(), json({preferConst: true}), commonjs()],
		output: {
			format: 'es'
		}
	})
	.pipe(source('index.js'))
	.pipe(gulp.dest('.'))
)

gulp.task('site', () =>
	rollup({
		input: 'src/site.js',
		external,
		plugins: [resolve(), json({preferConst: true}), commonjs()],
		output: {
			format: 'iife'
		}
	})
	.pipe(source('site.js'))
	.pipe(gulp.dest('./assets/js/'))
)

// clean
gulp.task('clean', gulp.parallel(
	() => gulp.src('./assets', {read: false}).pipe(clean()),
	() => gulp.src('./parts', {read: false}).pipe(clean()),
	() => gulp.src('./src/vars.styl', {read: false}).pipe(clean())
))

gulp.task('css', () => palette2oco.paletteReader(`src`)
	.load(['src/palette.oco'])
	.then(palette2oco.oco2Vars)
	.then(palette => palette2oco.paletteWriter('src/vars.styl', palette))
	.then(() => gulp.src('./src/style.styl')
		.pipe(stylus({
			'include css': true,
			compress: true,
			use: [nib()]
		}))
		.pipe(gulp.dest('./assets/css'))
	)
)

gulp.task('assets', gulp.parallel(
	() => gulp.src('src/assets/**').pipe(gulp.dest('./assets')),
	() => gulp.src('src/parts/**').pipe(gulp.dest('./parts')),
	() => gulp.src('node_modules/typopro-web/web/TypoPRO-Hack/*').pipe(gulp.dest('./assets/fonts/TypoPRO-Hack')),
	() => gulp.src('node_modules/typopro-web/web/TypoPRO-FiraSans/*').pipe(gulp.dest('./assets/fonts/TypoPRO-FiraSans')),
	() => gulp.src('node_modules/anchor-js/anchor.min.js').pipe(gulp.dest('./assets/js/')),
	() => gulp.src('node_modules/ace-css/css/ace.min.css').pipe(gulp.dest('./assets/css/')),
	() => gulp.src('node_modules/split.js/dist/split.min.js').pipe(gulp.dest('./assets/js/'))
))

// Default
gulp.task('default', gulp.series('clean', 'assets', 'css', 'site', 'build'))
