import unocss from '@unocss/postcss'
import autoprefixer from 'autoprefixer'
import nesting from 'postcss-nesting'

export default {
	plugins: [unocss(), autoprefixer(), nesting],
}
