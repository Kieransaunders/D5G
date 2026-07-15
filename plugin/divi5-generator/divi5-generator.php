<?php

/**
 * Plugin Name:       Divi5 Generator
 * Plugin URI:        https://github.com/Kieransaunders/Divi5Generate
 * Description:       AI-powered Divi 5 page generator. Import pages, presets, global variables, and SEO metadata from any external tool into Divi 5 via REST API.
 * Version:           2.0.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            iConnectIT
 * Support URI:       https://github.com/Kieransaunders/Divi5Generate/issues
 * Author URI:        https://iconnectit.co.uk
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       divi5-generator
 *
 * @fs_premium_only /src/SchemaInjector.php, /src/SeoWriter.php, /src/PageImporter.php, /src/PagePreviewer.php, /src/PresetManager.php, /src/GlobalVariablesImporter.php, /src/DbExporter.php, /src/DbImporter.php, /src/MenuImporter.php
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'D5G_VERSION', '2.0.0' );
define( 'D5G_FILE', __FILE__ );
define( 'D5G_DIR', plugin_dir_path( __FILE__ ) );

require_once D5G_DIR . 'vendor/autoload.php';

// DB export/import (`/db/export`, `/db/import`) transfer whole prefixed
// tables over REST — a big attack surface for a public commercial plugin
// (PRD §4 gap 7). They're Pro-gated (see D5G_RestApi::PRO_ONLY_ROUTES) AND
// refused by default even on Pro sites unless explicitly opted in here:
// define( 'D5G_ALLOW_DB_TRANSFER', true );

if ( ! function_exists( 'dg_fs' ) ) {
    function dg_fs() {
        global $dg_fs;

        if ( ! isset( $dg_fs ) ) {
            // id 33991 / slug 'divi5-generator' is THIS product's own Freemius
            // entry — confirmed 15/07/2026 by Kieran and cross-checked against
            // Airloop, which is a different product (id 31132, slug 'airloop').
            //
            // PRD §4 gap 1 claimed this id was copy-pasted from Airloop and would
            // activate against the wrong product. That was a bad inference from
            // the one value that WAS copy-pasted — premium_slug, which said
            // 'Airloop-premium' and is now correct. Don't reintroduce that claim.
            $dg_fs = fs_dynamic_init( array(
                'id'                  => '33991',
                'slug'                => 'divi5-generator',
                'premium_slug'        => 'divi5-generator-premium',
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

// Free-tier source. Every class below is reachable with no licence — Library
// import, /export, /pages, /ping (including SEO-plugin detection, which
// instantiates every Seo/* adapter to answer /ping's free `seo_plugin`
// field), Settings screen.
require_once D5G_DIR . 'src/Auth.php';
require_once D5G_DIR . 'src/Limits.php';
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
require_once D5G_DIR . 'src/PageExporter.php';
require_once D5G_DIR . 'src/LibraryImporter.php';
require_once D5G_DIR . 'src/PagesLister.php';
require_once D5G_DIR . 'src/RestApi.php';
require_once D5G_DIR . 'admin/SettingsPage.php';

// Pro-only source (F2). Every reference site is already behind pro_gate() /
// import_gate() / preview_gate() in RestApi.php, so gating the *require* on
// the same is__premium_only() check is redundant at runtime on this build —
// what it actually does is tell Freemius's build processor to strip this
// whole block (and, per the @fs_premium_only header tag above, the files
// themselves) from the auto-generated free zip. Without this wrapper the
// free zip would keep these require_once lines pointing at files that no
// longer exist and fatal on activation.
if ( dg_fs()->is__premium_only() ) {
    require_once D5G_DIR . 'src/SchemaInjector.php';
    require_once D5G_DIR . 'src/SeoWriter.php';
    require_once D5G_DIR . 'src/PageImporter.php';
    require_once D5G_DIR . 'src/PagePreviewer.php';
    require_once D5G_DIR . 'src/PresetManager.php';
    require_once D5G_DIR . 'src/GlobalVariablesImporter.php';
    require_once D5G_DIR . 'src/DbExporter.php';
    require_once D5G_DIR . 'src/DbImporter.php';
    require_once D5G_DIR . 'src/MenuImporter.php';
}

register_activation_hook( __FILE__, array( 'D5G_Auth', 'maybe_generate_key' ) );

add_action( 'rest_api_init', array( 'D5G_RestApi', 'register_routes' ) );
add_action( 'admin_menu',    array( 'D5G_SettingsPage', 'register' ) );
add_action( 'admin_init',    array( 'D5G_SettingsPage', 'handle_actions' ) );

// Same reasoning as the require above — SchemaInjector doesn't exist in the
// free build, so this hook registration must not exist there either.
if ( dg_fs()->is__premium_only() ) {
    add_action( 'wp_head', array( 'D5G_SchemaInjector', 'maybe_inject' ) );
}
