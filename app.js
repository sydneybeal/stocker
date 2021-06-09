var express = require('express');
var bodyParser = require("body-parser");
var app = express();
var path = require('path');

// requiring routes
var indexRoutes = require("./routes/index");

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.locals.moment = require('moment');
app.use(express.static("public"));
app.set('views', path.join(__dirname, 'views'));


// using routes
app.use("/",indexRoutes);

app.listen(3000, () => {
	console.log('Serving on port 3000')
})