//default language code, can be overwritten with lang parameter in URL
var lang = "de"; //for available codes see array availableLanguages in file GlobalOptions.js 

//new namespace for QGIS extensions
//do not modify those three lines
if (!window.QGIS) {
    window.QGIS = {};
}

//Base URL for WMS server
//var serverAndCGI = "http://localhost/cgi-bin/qgis_mapserv.fcgi";
var serverAndCGI = "/wms";

//search URLs
//URL for queries while typing
//at a later time QGIS server may provide query results, currently one needs a separate script
var searchBoxQueryURL = "/wsgi/search.wsgi?query=";
var searchBoxGetGeomURL = "/wsgi/getSearchGeom.wsgi";

//config for QGIS.SearchPanel
var gbKreisField = {
	xtype: 'combo',
	hiddenName: 'gb_kreis',
	fieldLabel: "GB-Kreis",
	mode: 'local',
	allowBlank: false,
	blankText: "Bitte GB-Kreis wählen",
	forceSelection: true,
	store: new Ext.data.ArrayStore({
		data: [
			[1601, "Betschwanden"],
			[1602, "Bilten"],
			[1603, "Braunwald"],
			[1604, "Diesbach"],
			[1605, "Elm"],
			[1606, "Engi"],
			[1607, "Ennenda"],
			[1608, "Filzbach"],
			[1609, "Glarus"],
			[1610, "Haslen"],
			[1611, "Hätzingen"],
			[1612, "Leuggelbach"],
			[1613, "Linthal"],
			[1614, "Luchsingen"],
			[1615, "Matt"],
			[1616, "Mitlödi"],
			[1617, "Mollis"],
			[1618, "Mühlehorn"],
			[1619, "Näfels"],
			[1620, "Netstal"],
			[1621, "Nidfurn"],
			[1622, "Niederurnen"],
			[1623, "Oberurnen"],
			[1624, "Obstalden"],
			[1625, "Riedern"],
			[1626, "Rüti (GL)"],
			[1627, "Schwanden (GL)"],
			[1628, "Schwändi"],
			[1629, "Sool"]
		],
		id: 0,
		fields: ['gb_kreis', 'name']
	}),
	valueField: 'gb_kreis',
	displayField: 'name'
};

var parzellensuche = {
	title: "Parzellensuche",
	query: 'parzelle',
	formItems: [
		{
			xtype: 'hidden',
			name: 'query',
			value: 'parzelle'
		},
		gbKreisField,
		{
			xtype: 'textfield',
			name: 'nummer',
			fieldLabel: "Nummer",
			allowBlank: false,
			blankText: "Bitte Parzellennummer wählen"
		}
	],
	gridColumns: [
		{header: 'ID', dataIndex: 'feature_id', menuDisabled: 'true'},
		{header: 'Nummer', dataIndex: 'nummer', menuDisabled: 'true'},
		{header: 'Fläche', dataIndex: 'flaechenmass', menuDisabled: 'true'},
	],
	selectionLayer: 'Liegenschaften.wkb_geometry',
	selectionZoom: 5
};

var gebaeudenummersuche = {
	title: "Gebäudenummersuche",
	query: 'gebaeudenummer',
	formItems: [
		{
			xtype: 'hidden',
			name: 'query',
			value: 'gebaeudenummer'
		},
		gbKreisField,
		{
			xtype: 'textfield',
			name: 'nummer',
			fieldLabel: "Nummer",
			allowBlank: false,
			blankText: "Bitte Gebäudenummer wählen"
		}
	],
	gridColumns: [
		{header: 'ID', dataIndex: 'feature_id', menuDisabled: 'true'},
		{header: 'Nummer', dataIndex: 'nummer', menuDisabled: 'true'}
	],
	selectionLayer: 'Gebaeudenummer',
	selectionZoom: 11
};

//list of configs for QGIS.SearchPanel per map name
var mapSearchPanelConfigs = {
	"av_glarus": [parzellensuche, gebaeudenummersuche],
	"av_sw_glarus": [parzellensuche, gebaeudenummersuche]
};

//first part of titlebar text
var titleBarText = "GIS-Browser Kanton Glarus - "; // will be appended with project title

//EPSG projection code
var epsgcode = 21781;

// OpenLayers global options
// see http://dev.openlayers.org/releases/OpenLayers-2.10/doc/apidocs/files/OpenLayers/Map-js.html
var MapOptions = {
	projection: new OpenLayers.Projection("EPSG:"+epsgcode),
	units: "m",
	maxScale:50,
	minScale:40000,
	numZoomLevels:20,
	fractionalZoom: true,
	transitionEffect:"resize",
	controls: []
};

//overview map settings - do not change variable names!
var OverviewMapOptions = {
	projection: new OpenLayers.Projection("EPSG:"+epsgcode),
	units: "m",
	maxScale:50,
	minScale:250000,
	transitionEffect:"resize"
};
var OverviewMapSize = new OpenLayers.Size(200,200);
var overviewLayer = new OpenLayers.Layer.WMS("Pixelkarte",
			serverAndCGI + "/av_glarus_server",
			{layers:"relief_gl_20m",format:"image/jpeg"},
			{buffer:0,singleTile:true,transitionEffect:"resize"});


//print options - scales and dpi
var printCapabilities={
    "scales":[
	{"name":"1:100","value":"100"},
	{"name":"1:200","value":"200"},
	{"name":"1:250","value":"250"},
	{"name":"1:500","value":"500"},
	{"name":"1:1'000","value":"1000"},
	{"name":"1:2'000","value":"2000"},
	{"name":"1:3'000","value":"3000"},
	{"name":"1:5'000","value":"5000"},
	{"name":"1:7'500","value":"7500"},
	{"name":"1:10'000","value":"10000"},
	{"name":"1:12'000","value":"12000"},
	{"name":"1:15'000","value":"15000"},
	{"name":"1:20'000","value":"20000"},
	{"name":"1:25'000","value":"25000"},
	{"name":"1:30'000","value":"30000"},
	{"name":"1:50'000","value":"50000"}
     ],
    "dpis":[
	{"name":"150 dpi","value":"150"},
	{"name":"300 dpi","value":"300"},
	{"name":"600 dpi","value":"600"},
	{"name":"1200 dpi","value":"1200"}
    ],
    "layouts":[]
};

//styling definitions for highlightLayer
//is used for hightlighting features (GetFeatureInfo and search result visualization)
//see http://dev.openlayers.org/releases/OpenLayers-2.10/doc/apidocs/files/OpenLayers/Style-js.html
var symbolizersHighLightLayer = {
	"Point": {
		pointRadius: 4,
		graphicName: "circle",
		fillColor: "#FF8C00",
		fillOpacity: 0.3,
		strokeWidth: 1,
		strokeColor: "#FF8C00"
	},
	"Line": {
		strokeWidth: 3,
		strokeOpacity: 1,
		strokeColor: "#FF8C00",
		strokeDashstyle: "dash"
	},
	"Polygon": {
		strokeWidth: 2,
		strokeColor: "#FF8C00",
		fillColor: "none"
	}
};

//styling for measure controls (distance and area)
var sketchSymbolizersMeasureControls = {
	"Point": {
		pointRadius: 4,
		graphicName: "square",
		fillColor: "#FFFFFF",
		fillOpacity: 1,
		strokeWidth: 1,
		strokeOpacity: 1,
		strokeColor: "#FF0000"
	},
	"Line": {
		strokeWidth: 3,
		strokeOpacity: 1,
		strokeColor: "#FF0000",
		strokeDashstyle: "dash"
	},
	"Polygon": {
		strokeWidth: 2,
		strokeOpacity: 1,
		strokeColor: "#FF0000",
		fillColor: "#FFFFFF",
		fillOpacity: 0.3
	}
};
