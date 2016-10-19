/* eslint-env browser */
/* global anchors */

// add anchor links to headers
anchors.options.placement = 'left'
anchors.add('h3').remove('.no-anchor')

// Filter UI
const tocElements = document.getElementById('toc')
	.getElementsByTagName('li')

const filterInput = document.getElementById('filter-input')

filterInput.addEventListener('keyup', e => {
	// enter key
	if (e.keyCode === 13) {
		// go to the first displayed item in the toc
		for (let i = 0; i < tocElements.length; i++) {
			const element = tocElements[i]
			if (!element.classList.contains('display-none')) {
				location.replace(element.firstChild.href)
				return e.preventDefault()
			}
		}
	}

	let match = () => true

	const value = filterInput.value.toLowerCase()

	if (!value.match(/^\s*$/)) {
		match = element => element.firstChild.innerHTML.toLowerCase().indexOf(value) !== -1
	}

	for (let i = 0; i < tocElements.length; i++) {
		const element = tocElements[i]
		const children = Array.from(element.getElementsByTagName('li'))
		if (match(element) || children.some(match)) {
			element.classList.remove('display-none')
		} else {
			element.classList.add('display-none')
		}
	}
})

const toggles = document.getElementsByClassName('toggle-step-sibling')
for (let i = 0; i < toggles.length; i++) {
	toggles[i].addEventListener('click', toggleStepSibling)
}

function formatDisclosure(source, target, _class) {
	if (source.classList.contains(_class)) {
		source.classList.remove(_class)
		target.innerHTML = '▾'
	} else {
		source.classList.add(_class)
		target.innerHTML = '▸'
	}
}

function toggleStepSibling() {
	const stepSibling = this.parentNode.parentNode.parentNode.getElementsByClassName('toggle-target')[0]
	formatDisclosure(stepSibling, stepSibling, 'display-none')
}

const items = document.getElementsByClassName('toggle-sibling')
for (let j = 0; j < items.length; j++) {
	items[j].addEventListener('click', toggleSibling)
}

function toggleSibling() {
	const stepSibling = this.parentNode.getElementsByClassName('toggle-target')[0]
	const icon = this.getElementsByClassName('icon')[0]
	formatDisclosure(stepSibling, icon, 'display-none')
}

function showHashTarget(targetId) {
	const hashTarget = document.getElementById(targetId)
	// new target is hidden
	if (hashTarget && hashTarget.offsetHeight === 0 &&
		hashTarget.parentNode.parentNode.classList.contains('display-none')) {
		hashTarget.parentNode.parentNode.classList.remove('display-none')
	}
}

window.addEventListener('hashchange', () => {
	showHashTarget(location.hash.substring(1))
})

showHashTarget(location.hash.substring(1))

const toclinks = document.getElementsByClassName('pre-open')
for (let k = 0; k < toclinks.length; k++) {
	toclinks[k].addEventListener('mousedown', preOpen, false)
}

function preOpen() {
	showHashTarget(this.hash.substring(1))
}

