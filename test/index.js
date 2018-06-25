import test from 'ava'
import remark from 'remark'
import theme from '..'

test('main', async t => {
	const comments = [
		{
			path: [],
			context: {},
			description: await remark().parse('test'),
			members: {
				static: [],
				instance: []
			},
			returns: [{
				type: {
					type: 'NameExpression',
					name: 'Foo'
				}
			}]
		}
	]

	const err = await theme(comments, {})
	console.log(err)
	t.pass()
})
