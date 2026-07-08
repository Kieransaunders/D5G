<?php

/**
 * Plugin Name:       Divi5 Generator
 * Plugin URI:        https://github.com/Kieransaunders/Divi5Generate
 * Description:       AI-powered Divi 5 page generator. Import pages, presets, global variables, and SEO metadata from any external tool into Divi 5 via REST API.
 * Version:           1.8.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            iConnectIT
 * Support URI:       https://github.com/Kieransaunders/Divi5Generate/issues
 * Author URI:        https://iconnectit.co.uk
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       divi5-generator
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'D5G_VERSION', '1.8.0' );
define( 'D5G_FILE', __FILE__ );
define( 'D5G_DIR', plugin_dir_path( __FILE__ ) );

require_once D5G_DIR . 'vendor/autoload.php';

if ( ! function_exists( 'dg_fs' ) ) {
    function dg_fs() {
        global $dg_fs;

        if ( ! isset( $dg_fs ) ) {
            $dg_fs = fs_dynamic_init( array(
                'id'                  => '33991',
                'slug'                => 'divi5-generator',
                'premium_slug'        => 'Airloop-premium',
                'type'                => 'plugin',
                'public_key'          => 'pk_de854535213324795d60f5ef66541',
                'is_premium'          => true,
                'premium_suffix'      => 'Pro',
                'has_premium_version' => true,
                'has_addons'          => false,
                'has_paid_plans'      => true,
                'is_org_compliant'    => true,
                'wp_org_gatekeeper'   => 'OA7#BoRiBNqdf52FvzEf!!074aRLPs8fspif$7K1#4u4Csys1fQlCecVcUTOs2mcpeVHi#C2j9d09fOTvbC0HloPT7fFee5WdS3G',
                'menu'                => array(
                    'contact'        => false,
                ),
            ) );
        }

        return $dg_fs;
    }

    dg_fs();
    do_action( 'dg_fs_loaded' );
}

require_once D5G_DIR . 'src/Auth.php';
require_once D5G_DIR . 'src/Limits.php';
require_once D5G_DIR . 'src/SchemaInjector.php';
require_once D5G_DIR . 'src/Seo/Adapter.php';
require_once D5G_DIR . 'src/Seo/AdapterBase.php';
require_once D5G_DIR . 'src/Seo/Normaliser.php';
require_once D5G_DIR . 'src/Seo/Fallback.php';
require_once D5G_DIR . 'src/Seo/Yoast.php';
require_once D5G_DIR . 'src/Seo/RankMath.php';
require_once D5G_DIR . 'src/Seo/AIOSEO.php';
require_once D5G_DIR . 'src/Seo/SEOPress.php';
require_once D5G_DIR . 'src/Seo/TSF.php';
require_once D5G_DIR . 'src/Seo/Detector.php';
require_once D5G_DIR . 'src/SeoWriter.php';
require_once D5G_DIR . 'src/PageImporter.php';
require_once D5G_DIR . 'src/PagePreviewer.php';
require_once D5G_DIR . 'src/PageExporter.php';
require_once D5G_DIR . 'src/LibraryImporter.php';
require_once D5G_DIR . 'src/PresetManager.php';
require_once D5G_DIR . 'src/GlobalVariablesImporter.php';
require_once D5G_DIR . 'src/PagesLister.php';
require_once D5G_DIR . 'src/DbExporter.php';
require_once D5G_DIR . 'src/DbImporter.php';
require_once D5G_DIR . 'src/MenuImporter.php';
require_once D5G_DIR . 'src/RestApi.php';
require_once D5G_DIR . 'admin/SettingsPage.php';

register_activation_hook( __FILE__, array( 'D5G_Auth', 'maybe_generate_key' ) );

add_action( 'rest_api_init', array( 'D5G_RestApi', 'register_routes' ) );
add_action( 'wp_head',       array( 'D5G_SchemaInjector', 'maybe_inject' ) );
add_action( 'admin_menu',    array( 'D5G_SettingsPage', 'register' ) );
add_action( 'admin_init',    array( 'D5G_SettingsPage', 'handle_actions' ) );
