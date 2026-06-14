<?php
/**
 * Plugin Name: Nashik Headlines — Yoast SEO REST API Bridge
 * Description: Custom REST API endpoint for directly setting Yoast SEO meta
 *              fields via update_post_meta(), bypassing WordPress REST API
 *              meta registration requirements. Guarantees SEO fields are saved.
 * Version:     2.0.0
 *
 * INSTALLATION:
 *   Upload this file to: /wp-content/mu-plugins/yoast-rest-api-bridge.php
 *   (Create the mu-plugins folder if it doesn't exist)
 *   Must-use plugins load automatically — no activation needed.
 *   Verify install: visit https://navimumbaiheadlines.com/wp-json/nmh/v1/ping
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ── Register custom REST API namespace ────────────────────────────────────────
add_action( 'rest_api_init', 'nmh_register_routes' );

function nmh_register_routes() {

    // Health check — test that the plugin is active
    register_rest_route( 'nmh/v1', '/ping', [
        'methods'             => 'GET',
        'callback'            => function() {
            return [ 'status' => 'ok', 'plugin' => 'yoast-rest-api-bridge', 'version' => '2.0.0' ];
        },
        'permission_callback' => '__return_true',
    ] );

    // Set Yoast SEO meta fields directly via update_post_meta()
    register_rest_route( 'nmh/v1', '/set-seo-meta', [
        'methods'             => 'POST',
        'callback'            => 'nmh_set_seo_meta',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args' => [
            'post_id' => [
                'required'          => true,
                'validate_callback' => function( $v ) { return is_numeric( $v ) && $v > 0; },
            ],
            'meta' => [
                'required' => true,
                'type'     => 'object',
            ],
        ],
    ] );
}

function nmh_set_seo_meta( WP_REST_Request $request ) {
    $post_id = intval( $request->get_param( 'post_id' ) );
    $meta    = $request->get_param( 'meta' );

    $post = get_post( $post_id );
    if ( ! $post ) {
        return new WP_Error( 'invalid_post', 'Post not found', [ 'status' => 404 ] );
    }

    if ( ! is_array( $meta ) || empty( $meta ) ) {
        return new WP_Error( 'invalid_meta', 'meta must be a non-empty object', [ 'status' => 400 ] );
    }

    // Allowed Yoast SEO meta keys (whitelist for security)
    $allowed_keys = [
        '_yoast_wpseo_focuskw',
        '_yoast_wpseo_title',
        '_yoast_wpseo_metadesc',
        '_yoast_wpseo_canonical',
        '_yoast_wpseo_opengraph-title',
        '_yoast_wpseo_opengraph-description',
        '_yoast_wpseo_opengraph-image',
        '_yoast_wpseo_opengraph-image-id',
        '_yoast_wpseo_twitter-title',
        '_yoast_wpseo_twitter-description',
        '_yoast_wpseo_twitter-image',
        '_yoast_wpseo_meta-robots-noindex',
        '_yoast_wpseo_meta-robots-nofollow',
        '_yoast_wpseo_estimated-reading-time-minutes',
    ];

    $updated = [];
    $skipped = [];

    foreach ( $meta as $key => $value ) {
        if ( ! in_array( $key, $allowed_keys, true ) ) {
            $skipped[] = $key;
            continue;
        }
        // Sanitize and write directly via update_post_meta (no registration needed)
        $sanitized = sanitize_text_field( wp_unslash( (string) $value ) );
        update_post_meta( $post_id, $key, $sanitized );
        $updated[] = $key;
    }

    // Trigger Yoast indexable rebuild so the SEO analysis panel refreshes
    nmh_rebuild_yoast_indexable( $post_id, $post );

    return [
        'success' => true,
        'post_id' => $post_id,
        'updated' => $updated,
        'skipped' => $skipped,
        'count'   => count( $updated ),
    ];
}

// ── Trigger Yoast indexable rebuild ───────────────────────────────────────────
function nmh_rebuild_yoast_indexable( int $post_id, WP_Post $post ) {
    // Method 1: Use Yoast's Post Watcher (Yoast SEO 14+)
    if ( function_exists( 'YoastSEO' ) ) {
        try {
            $watcher = YoastSEO()->classes->get(
                'Yoast\WP\SEO\Integrations\Watchers\Indexable_Post_Watcher'
            );
            if ( $watcher && method_exists( $watcher, 'build_indexable' ) ) {
                $watcher->build_indexable( $post_id );
                return;
            }
        } catch ( Exception $e ) {
            // Fall through to method 2
        }
    }

    // Method 2: Fire the save_post action so Yoast re-reads post meta
    remove_action( 'save_post', 'wpseo_save_postdata' );
    do_action( 'save_post', $post_id, $post, true );
    if ( function_exists( 'wpseo_save_postdata' ) ) {
        wpseo_save_postdata( $post_id );
    }
}
