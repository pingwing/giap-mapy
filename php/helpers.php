<?php
/**
    QGIS-WEB-CLIENT - PHP HELPERS

    Common functions and configuration

    @copyright: 2013 by Alessandro Pasotti - (http://www.itopen.it) <apasotti@gmail.com>
    @license: GNU AGPL, see COPYING for details.
*/



/**
 * Return 500 errro
 */
function err500($msg){
    header('Internal server error', true, 500);
    echo "<h1>Internal server error (QGIS Client)</h1><p>$msg</p>";
    exit;
}


/**
 * Load .qgs file
 */
function get_project($map){
    if(file_exists($map) && is_readable($map)){
        $project = @simplexml_load_file($map);
        if(!$project){
            err500('project not valid');
        }
    } else {
        err500('project not found');
    }
    return $project;
}

/**
 * Get postgis layer connection and geom info
 */
function get_pg_layer_info($layer, $project){
    // Cache
    static $pg_layer_infos = array();

    if(!$layer->provider == 'postgis'){
        err500('not a postgis layer');
    }
    // Datasource
    $datasource = (string)$layer->datasource;

    if(array_key_exists($datasource, $pg_layer_infos)){
        return $pg_layer_infos[$datasource];
    }


    // Parse datasource
    $ds_parms = array();
    // First extract sql=
    if(preg_match('/sql=(.*)/', $datasource, $matches)){
        $datasource = str_replace($matches[0], '', $datasource);
        $ds_parms['sql'] = $matches[1];
    }
    foreach(explode(' ', $datasource) as $token){
        $kv = explode('=', $token);
        if(count($kv) == 2){
            $ds_parms[$kv[0]] = $kv[1];
        } else { // Parse (geom)
            if(preg_match('/\(([^\)]+)\)/', $kv[0], $matches)){
                $ds_parms['geom_column'] = $matches[1];
            }
            // ... maybe other parms ...
        }
    }
    $pg_layer_infos[$datasource] = $ds_parms;
    return $ds_parms;
}

/**
 * Rewrite and append
 */
function get_map_path($mapname){
    // Rewrite map to full path
    if(defined('MAP_PATH_REWRITE') && MAP_PATH_REWRITE){
        $mapname = MAP_PATH_REWRITE . $mapname;
        if(defined('MAP_PATH_APPEND_QGS') && MAP_PATH_APPEND_QGS){
            $mapname .= '.qgs';
        }
    }
    return $mapname;
}


/**
 * Load a layer instance from the project
 *
 */
function get_layer($layername, $project){
    // Caching
    static $layers = array();
    if(array_key_exists($layername, $layers)){
        return $layers[$layername];
    }
    $xpath = '//maplayer/layername[.="' . $layername . '"]/parent::*';
    if(!$layer = $project->xpath($xpath)){
        err500('layer not found');
    }
    $layers[$layername] = $layer[0];
    return $layer[0];
}


/**
 * List categories from a layer
 */
function get_categories($layer){
    // Ok, we have the layer, list categories
    $categories = $layer->xpath('//categories');
    return $categories;
}

/**
 * Get connection from layer
 */
function get_connection($layer, $project){

    $ds_parms = get_pg_layer_info($layer, $project);
    $PDO_DSN="pgsql:host=${ds_parms['host']};port=${ds_parms['port']};dbname=${ds_parms['dbname']}";

    try {
        $dbh = new PDO($PDO_DSN, $ds_parms['user'], $ds_parms['password']);
        $dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        err500('db error: ' . $e->getMessage());
    }
    return $dbh;
}

/**
 * Return current base URL
 */ 
function get_current_base_url() {
    $pageURL = 'http';
    if (@$_SERVER["HTTPS"] == "on") {$pageURL .= "s";}
    $pageURL .= "://";
    if ($_SERVER["SERVER_PORT"] != "80") {
        $pageURL .= $_SERVER["SERVER_NAME"].":".$_SERVER["SERVER_PORT"].$_SERVER["REQUEST_URI"];
    } else {
        $pageURL .= $_SERVER["SERVER_NAME"].$_SERVER["REQUEST_URI"];
    }
    // Strip query string
    $pageURL = substr($pageURL, 0, - (2 + strlen($_SERVER['QUERY_STRING']) + strlen(basename($_SERVER['PHP_SELF']))));
    return $pageURL;
}

/**
 * Returns WMS endpoint
 */
function get_wms_online_resource($mapname){
    $wms = defined('WMS_ONLINE_RESOURCE') && WMS_ONLINE_RESOURCE ? WMS_ONLINE_RESOURCE : get_current_base_url() . '/../cgi-bin/qgis_mapserv.fcgi?';
    // Add map
    $wms .= 'map='.$mapname.'&';
    return $wms;
}

/**
 * Returns legend data, querying WMS GetStyles and GetLegendGraphics
 */ 
function get_legend($mapname, $layername){
    // Check cache
    if(defined('GET_LEGEND_CACHE_EXPIRY') && GET_LEGEND_CACHE_EXPIRY){
        // Check cache folder
        $cache_folder = defined('GET_LEGEND_CACHE_DIRECTORY') && GET_LEGEND_CACHE_DIRECTORY ? GET_LEGEND_CACHE_DIRECTORY : dirname(__FILE__) . '/legend_cache/';
        if(!is_dir($cache_folder) && !@mkdir($cache_folder)){
            err500('Cannot create cache folder, check permissions and configuration.');
        }
        $cache_file = $cache_folder.'/'.md5($mapname.$layername);
        $filemtime = @filemtime($cache_file);  // returns FALSE if file does not exist
        if (!$filemtime or (time() - $filemtime >= GET_LEGEND_CACHE_EXPIRY)){
            file_put_contents($cache_file, serialize(build_legend($mapname, $layername)));
        }
        return unserialize(file_get_contents($cache_file));                
    }
    return build_legend($mapname, $layername);
}

/**
 * Build the legend
 */
function build_legend($mapname, $layername){
    // First, get layer styles
    $wms = get_wms_online_resource($mapname);
    $wms_base_call = $wms.'VERSION=1.1.1&SERVICE=WMS&LAYERS='.$layername.'&REQUEST=';
    $styles = simplexml_load_file($wms_base_call.'GetStyles');
    if($styles === false){
        err500('Cannot fetch legend styles');
    }
    $results = array();
    // For each style, get legend string and image
    foreach($styles->xpath('//se:Rule') as $rule){
        $name = $rule->xpath('se:Name');
        $filter = $rule->xpath('ogc:Filter/*');
        $filter = preg_replace('/>\s+</', '><', str_replace(array("\n", 'ogc:'), '', (string)$filter[0]->asXML()));
        $image = file_get_contents($wms_base_call.'GetLegendGraphic&FORMAT=image/png&RULE='.(string)$name[0]);
        if($image === false){
            err500('Cannot fetch legend image');
        }
        $results[] = array(
            'name' => (string)$name[0],
            'ogc_filter' => $filter,
            'image' => base64_encode($image)
        );
        
    }
    return $results;
}
