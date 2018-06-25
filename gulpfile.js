/* ─────────────╮
 │ gulp/cordial │
 ╰──────────────┴────────────────────────────────────────────────────────────── */

const gulp = require('gulp')
const rename = require('gulp-rename')
const clean = require('gulp-clean')
const rollup = require('gulp-better-rollup')
const babel = require('rollup-plugin-babel')
const {uglify} = require('rollup-plugin-uglify')
const lodash = require('babel-plugin-lodash')
const palette2oco = require('@thebespokepixel/palette2oco')
const stylus = require('gulp-stylus')
const nib = require('nib')

const external = [
	'lodash/template',
	'lodash/kebabCase',
	'fs',
	'path',
	'vinyl',
	'vinyl-fs',
	'concat-stream',
	'github-slugger',
	'documentation',
	'highlight.js',
	'@thebespokepixel/badges',
	'remark',
	'remark-heading-gap',
	'remark-squeeze-paragraphs'
]

const babelConfig = {
	plugins: [lodash],
	presets: [
		['@babel/preset-env', {
			modules: false,
			targets: {
				node: "8"
			}
		}]
	],
	comments: false,
	exclude: 'node_modules/**'
}

const babelWebConfig = {
	plugins: [lodash],
	presets: [
		['@babel/preset-env', {
			modules: false
		}]
	],
	comments: false,
	exclude: 'node_modules/**'
}

gulp.task('build', () =>
	gulp.src('src/index.js')
		.pipe(rollup({
			external,
			plugins: [babel(babelConfig)]
		}, {
			format: 'cjs'
		}))
		.pipe(rename('index.js'))
		.pipe(gulp.dest('.'))
)

gulp.task('site', () =>
	gulp.src('src/site.js')
		.pipe(rollup({
			plugins: [babel(babelWebConfig), uglify()]
		}, {
			format: 'iife'
		}))
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
	() => gulp.src('node_modules/ace-css/css/ace.min.css').pipe(gulp.dest('./assets/css/'))
))

// Default
gulp.task('default', gulp.series('clean', 'assets', 'css', 'site', 'build'))
