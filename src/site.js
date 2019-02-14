/* eslint-env browser */
/* eslint new-cap:0,no-undef:0 */
/* global anchors */

// add anchor links to headers
anchors.options.placement = 'left'
anchors.add('h3').remove('.no-anchor')

// Filter UI
const tocElements = document.querySelector('#toc').querySelectorAll('li')

const filterInput = document.querySelector('#filter-input')

filterInput.addEventListener('keyup', e => {
	// Enter key
	if (e.keyCode === 13) {
		// Go to the first displayed item in the toc
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
		const children = [...element.querySelectorAll('li')]
		if (match(element) || children.some(match)) {
			element.classList.remove('display-none')
		} else {
			element.classList.add('display-none')
		}
	}
})

const toggles = document.querySelectorAll('.toggle-step-sibling')
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
	const stepSibling = this.parentNode.parentNode.parentNode.querySelectorAll('.toggle-target')[0]
	formatDisclosure(stepSibling, stepSibling, 'display-none')
}

const items = document.querySelectorAll('toggle-sibling')
for (let j = 0; j < items.length; j++) {
	items[j].addEventListener('click', toggleSibling)
}

function toggleSibling() {
	const stepSibling = this.parentNode.querySelectorAll('.toggle-target')[0]
	const icon = this.querySelectorAll('.icon')[0]
	formatDisclosure(stepSibling, icon, 'display-none')
}

function showHashTarget(targetId) {
	const hashTarget = document.querySelector(`#${targetId}`)
	// New target is hidden
	if (hashTarget && hashTarget.offsetHeight === 0 &&
		hashTarget.parentNode.parentNode.classList.contains('display-none')) {
		hashTarget.parentNode.parentNode.classList.remove('display-none')
	}
}

window.addEventListener('hashchange', () => {
	showHashTarget(location.hash.substring(1))
})

showHashTarget(location.hash.substring(1))

const toclinks = document.querySelectorAll('.pre-open')
for (let k = 0; k < toclinks.length; k++) {
	toclinks[k].addEventListener('mousedown', preOpen, false)
}

function preOpen() {
	showHashTarget(this.hash.substring(1))
}

const splitLeft = document.querySelector('#split-left')
const splitRight = document.querySelector('#split-right')
// TODO const splitParent = splitLeft.parentNode
// TODO const cwWithSb = splitLeft.clientWidth
splitLeft.style.overflow = 'hidden'
// TODO const cwWithoutSb = splitLeft.clientWidth
splitLeft.style.overflow = ''

Split(['#split-left', '#split-right'], {
	elementStyle(dimension, size, gutterSize) {
		return {
			'flex-basis': 'calc(' + size + '% - ' + gutterSize + 'px)'
		}
	},
	gutterStyle(dimension, gutterSize) {
		return {
			'flex-basis': gutterSize + 'px'
		}
	},
	gutterSize: 20,
	sizes: [20, 80]
})

// Chrome doesn't remember scroll position properly so do it ourselves.
// Also works on Firefox and Edge.

function updateState() {
	history.replaceState(
		{
			leftTop: splitLeft.scrollTop,
			rightTop: splitRight.scrollTop
		},
		document.title
	)
}

function loadState(ev) {
	if (ev) {
		// Edge doesn't replace change history.state on popstate.
		history.replaceState(ev.state, document.title)
	}

	if (history.state) {
		splitLeft.scrollTop = history.state.leftTop
		splitRight.scrollTop = history.state.rightTop
	}
}

window.addEventListener('load', () => {
	// Restore after Firefox scrolls to hash.
	setTimeout(() => {
		loadState()
		// Update with initial scroll position.
		updateState()
		// Update scroll positions only after we've loaded because Firefox
		// emits an initial scroll event with 0.
		splitLeft.addEventListener('scroll', updateState)
		splitRight.addEventListener('scroll', updateState)
	}, 1)
})

window.addEventListener('popstate', loadState)
