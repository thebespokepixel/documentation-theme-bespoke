import {readFileSync} from 'fs'
import {join, resolve as resolvePath} from 'path'
import File from 'vinyl'
import vfs from 'vinyl-fs'
import _ from 'lodash'
import concat from 'concat-stream'
import GithubSlugger from 'github-slugger'
import {util} from 'documentation'
import hljs from 'highlight.js'
import badges from '@thebespokepixel/badges'
import remark from 'remark'
import gap from 'remark-heading-gap'
import squeeze from 'remark-squeeze-paragraphs'

const {createFormatters, LinkerStack} = util

function isFunction(section) {
	return (
		section.kind === 'function' ||
		(section.kind === 'typedef' &&
		section.type.type === 'NameExpression' &&
		section.type.name === 'Function')
	)
}

function formatSignature(section, formatters, isShort) {
	let returns = ''
	let prefix = ''
	if (section.kind === 'class') {
		prefix = 'new '
	} else if (!isFunction(section)) {
		return section.name
	}
	if (!isShort && section.returns && section.returns.length > 0) {
		returns = ' → ' +
			formatters.type(section.returns[0].type)
	}
	return prefix + section.name + formatters.parameters(section, isShort) + returns
}

export default async function (comments, config) {
	const linkerStack = new LinkerStack(config)
		.namespaceResolver(comments, namespace => {
			const slugger = new GithubSlugger()
			return '#' + slugger.slug(namespace)
		})

	const formatters = createFormatters(linkerStack.link)

	hljs.configure(config.hljs || {})

	const badgesAST = await badges('docs', true)

	const sharedImports = {
		imports: {
			kebabCase(str) {
				return _.kebabCase(str)
			},
			badges() {
				return formatters.markdown(badgesAST)
			},
			usage(example) {
				const usage = readFileSync(resolvePath(example))
				return remark().use(gap).use(squeeze).parse(usage)
			},
			slug(str) {
				const slugger = new GithubSlugger()
				return slugger.slug(str)
			},
			shortSignature(section) {
				return formatSignature(section, formatters, true)
			},
			signature(section) {
				return formatSignature(section, formatters)
			},
			md(ast, inline) {
				if (inline && ast && ast.children.length > 0 && ast.children[0].type === 'paragraph') {
					ast = {
						type: 'root',
						children: ast.children[0].children.concat(ast.children.slice(1))
					}
				}
				return formatters.markdown(ast)
			},
			formatType: formatters.type,
			autolink: formatters.autolink,
			highlight(example) {
				if (config.hljs && config.hljs.highlightAuto) {
					return hljs.highlightAuto(example).value
				}
				return hljs.highlight('js', example).value
			}
		}
	}

	const renderTemplate = source => _.template(readFileSync(join(__dirname, source), 'utf8'), sharedImports)

	sharedImports.imports.renderSectionList = renderTemplate('parts/section_list._')
	sharedImports.imports.renderSection = renderTemplate('parts/section._')
	sharedImports.imports.renderNote = renderTemplate('parts/note._')
	sharedImports.imports.renderParamProperty = renderTemplate('parts/paramProperty._')

	const pageTemplate = renderTemplate('parts/index._')

	// Push assets into the pipeline as well.
	return new Promise(resolve => {
		vfs.src([join(__dirname, 'assets', '**')], {base: __dirname}).pipe(
			concat(files => {
				resolve(
					files.concat(
						new File({
							path: 'index.html',
							contents: Buffer.from(pageTemplate({
								docs: comments,
								config
							}))
						})
					)
				)
			})
		)
	})
}
