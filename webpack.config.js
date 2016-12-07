var path = require('path');

module.exports = {
	entry: "./src/index.js",
	output: {
		path: "./dist",
		filename: "SGW-build.js"
	},
	resolve: {
		alias: {
			'slickCore': path.join(__dirname, 'src/utils/slick.core.js'),
			'jqueryEventDragWrapper': path.join(__dirname, 'src/utils/jqueryEventDragWrapper.js')
		}
	},
	module: {
		loaders : [{
				test: /\.js$/,
				exclude: /node_modules/,
				loader: 'babel-loader'
			},
			{
                test: /slick.core/,
                loader: 'imports?jQuery=jquery,$=jquery,this=>window'
            },
            {
                test: /slick.grid.js/,
                loader: 'exports?Slick!imports?slickCore,jQuery=jquery,$=jquery,jqueryEventDragWrapper,this=>window'
            }
            // {
            //     test: /slick.dataview.js/,
            //     loader: 'imports?jQuery=jquery,$=jquery,this=>window'
            // }
		]
	}
};