<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_MenuImporter {

	public static function create( array $payload ): array {
		$warnings = array();

		$name     = sanitize_text_field( $payload['name'] ?? '' );
		$location = sanitize_text_field( $payload['location'] ?? '' );
		$items    = $payload['items'] ?? array();

		if ( ! $name ) {
			throw new InvalidArgumentException( 'Menu name is required.' );
		}

		$menu_id = wp_create_nav_menu( $name );
		if ( is_wp_error( $menu_id ) ) {
			$existing = wp_get_nav_menu_object( $name );
			if ( $existing ) {
				$menu_id = $existing->term_id;
				$warnings[] = "Menu '{$name}' already exists — appending items.";
			} else {
				throw new RuntimeException(
					'Failed to create menu: ' . $menu_id->get_error_message()
				);
			}
		}

		$db_map = array();
		$order  = array();

		foreach ( $items as $i => $item ) {
			if ( empty( $item['label'] ) ) {
				$warnings[] = "Skipping item at index {$i}: no label.";
				continue;
			}

			$args = array(
				'menu-item-title'    => sanitize_text_field( $item['label'] ),
				'menu-item-position' => $item['order'] ?? ( $i + 1 ),
				'menu-item-status'   => 'publish',
			);

			if ( ! empty( $item['page_id'] ) ) {
				$args['menu-item-object-id'] = (int) $item['page_id'];
				$args['menu-item-object']    = $item['post_type'] ?? 'page';
				$args['menu-item-type']      = 'post_type';
			} elseif ( ! empty( $item['url'] ) ) {
				$args['menu-item-url']  = esc_url_raw( $item['url'] );
				$args['menu-item-type'] = 'custom';
			} else {
				$warnings[] = "Skipping item '{$item['label']}' at index {$i}: needs page_id or url.";
				continue;
			}

			$db_id = wp_update_nav_menu_item( $menu_id, 0, $args );
			if ( is_wp_error( $db_id ) ) {
				$warnings[] = "Failed to add item '{$item['label']}': " . $db_id->get_error_message();
				continue;
			}

			$cid = $item['id'] ?? 'idx_' . $i;
			$db_map[ $cid ] = (int) $db_id;
			$order[ (int) $db_id ] = $cid;
		}

		foreach ( $items as $i => $item ) {
			if ( empty( $item['parent_id'] ) ) {
				continue;
			}
			$cid    = $item['id'] ?? 'idx_' . $i;
			$parent = $item['parent_id'];

			if ( isset( $db_map[ $cid ] ) && isset( $db_map[ $parent ] ) ) {
				wp_update_nav_menu_item( $menu_id, $db_map[ $cid ], array(
					'menu-item-parent-id' => $db_map[ $parent ],
				) );
			}
		}

		if ( $location && has_nav_menu( $location ) ) {
			$locations            = get_theme_mod( 'nav_menu_locations', array() );
			$locations[ $location ] = $menu_id;
			set_theme_mod( 'nav_menu_locations', $locations );
		} elseif ( $location ) {
			$warnings[] = "Theme location '{$location}' does not exist — menu created but not assigned.";
		}

		$created = array();
		foreach ( $order as $db_id => $cid ) {
			$item_data = array();
			foreach ( $items as $it ) {
				if ( ( $it['id'] ?? 'idx_' . array_search( $it, $items, true ) ) === $cid ) {
					$item_data = $it;
					break;
				}
			}
			$entry = array(
				'db_id' => $db_id,
				'label' => sanitize_text_field( $item_data['label'] ?? '' ),
			);
			if ( ! empty( $item_data['page_id'] ) ) {
				$entry['page_id'] = (int) $item_data['page_id'];
			}
			if ( ! empty( $item_data['url'] ) ) {
				$entry['url'] = esc_url_raw( $item_data['url'] );
			}
			if ( ! empty( $item_data['parent_id'] ) && isset( $db_map[ $item_data['parent_id'] ] ) ) {
				$entry['parent_db_id'] = $db_map[ $item_data['parent_id'] ];
			}
			$created[] = $entry;
		}

		return array(
			'menu_id'    => $menu_id,
			'name'       => $name,
			'location'   => $location ?: null,
			'item_count' => count( $created ),
			'items'      => $created,
			'warnings'   => $warnings,
		);
	}

	public static function list_menus( ?string $name = null ): array {
		$menus = wp_get_nav_menus();
		$out   = array();

		foreach ( $menus as $menu ) {
			if ( $name && $menu->name !== $name ) {
				continue;
			}

			$items      = wp_get_nav_menu_items( $menu->term_id );
			$tree       = self::build_hierarchy( $items );
			$theme_locs = array();

			$all_locs = get_theme_mod( 'nav_menu_locations', array() );
			foreach ( $all_locs as $loc => $mid ) {
				if ( (int) $mid === (int) $menu->term_id ) {
					$theme_locs[] = $loc;
				}
			}

			$out[] = array(
				'id'              => (int) $menu->term_id,
				'name'            => $menu->name,
				'slug'            => sanitize_title( $menu->name ),
				'theme_locations' => $theme_locs,
				'item_count'      => count( $items ),
				'items'           => $tree,
			);
		}

		return array( 'menus' => $out );
	}

	private static function build_hierarchy( array $items ): array {
		$by_id = array();
		$roots = array();

		foreach ( $items as $it ) {
			$id = (int) $it->db_id;
			$by_id[ $id ] = array(
				'db_id'    => $id,
				'label'    => $it->title,
				'page_id'  => (int) $it->object_id,
				'type'     => $it->type,
				'url'      => $it->url,
				'order'    => (int) $it->menu_order,
				'children' => array(),
			);
		}

		foreach ( $by_id as $id => &$node ) {
			$parent = 0;
			foreach ( $items as $it ) {
				if ( (int) $it->db_id === $id ) {
					$parent = (int) $it->menu_item_parent;
					break;
				}
			}
			if ( $parent && isset( $by_id[ $parent ] ) ) {
				$by_id[ $parent ]['children'][] = &$node;
			} else {
				$roots[] = &$node;
			}
		}
		unset( $node );

		return $roots;
	}

	private const STOP_WORDS = array(
		'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to',
		'for', 'with', 'our', 'us', 'is', 'it', 'by', 'we', 'your',
	);

	public static function auto_place( array $payload ): array {
		$warnings = array();

		$menu_name = sanitize_text_field( $payload['menu_name'] ?? '' );
		$pages     = $payload['pages'] ?? array();

		if ( ! $menu_name ) {
			throw new InvalidArgumentException( 'menu_name is required.' );
		}

		$menu_obj = wp_get_nav_menu_object( $menu_name );
		if ( ! $menu_obj || empty( $menu_obj->term_id ) ) {
			throw new InvalidArgumentException( "Menu '{$menu_name}' not found." );
		}
		$menu_id = (int) $menu_obj->term_id;

		$existing      = wp_get_nav_menu_items( $menu_id );
		$existing_ids  = array();
		$by_label      = array();

		foreach ( $existing as $it ) {
			$existing_ids[] = (int) $it->object_id;
			if ( empty( $it->menu_item_parent ) || (int) $it->menu_item_parent === 0 ) {
				$label = strtolower( trim( $it->title ) );
				$by_label[ $label ] = (int) $it->db_id;
			}
		}

		$placed  = 0;
		$skipped = 0;
		$items   = array();

		foreach ( $pages as $page ) {
			$page_id = (int) ( $page['page_id'] ?? 0 );
			$title   = sanitize_text_field( $page['title'] ?? '' );

			if ( ! $page_id || ! $title ) {
				$warnings[] = "Skipping page with id {$page_id}: missing page_id or title.";
				$skipped++;
				continue;
			}

			if ( in_array( $page_id, $existing_ids, true ) ) {
				$warnings[] = "Page '{$title}' (id {$page_id}) already exists in menu — skipped.";
				$skipped++;
				continue;
			}

			$parent_label = self::find_parent_for( $title, $by_label );

			$args = array(
				'menu-item-title'     => $title,
				'menu-item-position'  => count( $existing ) + $placed + 1,
				'menu-item-status'    => 'publish',
				'menu-item-object-id' => $page_id,
				'menu-item-object'    => 'page',
				'menu-item-type'      => 'post_type',
			);

			if ( $parent_label !== null ) {
				$args['menu-item-parent-id'] = $by_label[ $parent_label ];
			}

			$db_id = wp_update_nav_menu_item( $menu_id, 0, $args );
			if ( is_wp_error( $db_id ) ) {
				$warnings[] = "Failed to add page '{$title}': " . $db_id->get_error_message();
				$skipped++;
				continue;
			}

			$entry = array(
				'db_id'   => (int) $db_id,
				'label'   => $title,
				'page_id' => $page_id,
			);
			if ( $parent_label !== null ) {
				$entry['parent_db_id'] = $by_label[ $parent_label ];
			}
			$items[] = $entry;
			$placed++;
		}

		return array(
			'menu_id'  => $menu_id,
			'placed'   => $placed,
			'skipped'  => $skipped,
			'items'    => $items,
			'warnings' => $warnings,
		);
	}

	private static function find_parent_for( string $title, array $by_label ): ?string {
		$words = array_filter(
			preg_split( '/\s+/', strtolower( $title ) ),
			function ( $w ) {
				return strlen( $w ) > 1 && ! in_array( $w, self::STOP_WORDS, true );
			}
		);

		if ( empty( $words ) ) {
			return null;
		}

		$best       = null;
		$best_score = 0;

		foreach ( $by_label as $label => $db_id ) {
			$lw = array_filter(
				preg_split( '/\s+/', $label ),
				function ( $w ) {
					return strlen( $w ) > 1 && ! in_array( $w, self::STOP_WORDS, true );
				}
			);
			$score = count( array_intersect( $words, $lw ) );
			if ( $score > $best_score ) {
				$best       = $label;
				$best_score = $score;
			}
		}

		return $best;
	}
}
