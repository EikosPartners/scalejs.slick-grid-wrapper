## scalejs.slick-grid-wrapper

# To Install 
npm install scalejs.slick-grid-wrapper --save

# To Use
1. Import 'slick-grid-wrapper' before the view is rendered so that the custom knockout binding is registered. In ScaleJS 2.0, we recommend importing this file in 'scalejs.extensions.js'.
2. In your HTML add the custom binding 'slickGridWrapper' to the element that will contain the grid.
3. Expose the data from the viewModel to the view (more specific details forthcoming).
4. Assuming you're using Webpack, you will need to update two parts of your webpack.config file, alias and loaders. Update Alias as follows:

```javascript
alias {
	'slickCore': path.join(__dirname, 'node_modules/slick-grid-wrapper/dist/utils/slick.core')
}
```
	And in the loaders:
```javascript
{
    test: /slick.core/,
    loader: 'imports?jQuery=jquery,$=jquery,this=>window'
},
{
    test: /slick.grid.js/,
    loader: 'exports?Slick!imports?slickCore,jQuery=jquery,$=jquery,jqm=jquery-mousewheel,this=>window'
}
```

# NOTES

The filtering logic has been simplified to only support a user applying a filter from the input boxes in each column at the top of the grid. The simplified file is named observableFiltersInlineFiltering.js. The original file which supported advanced filtering, with a separate popup window, is in observableFiltersAdvancedFiltering.js. This is only saved as a reference and is not used anywhere.

