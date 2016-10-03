import test from 'ava'
import remark from 'remark'
import theme from '..'

test('main', t => {
	const comments = [
		{
			path: [],
			context: {},
			description: remark().parse('test'),
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

	theme(comments, {}, err => {
		t.ifError(err)
		t.pass()
	})
})
