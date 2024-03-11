
///if (is_paint || is_sculpt)
let ui_nodes_show: bool = false;
///end
///if is_lab
let ui_nodes_show: bool = true;
///end

let ui_nodes_wx: i32;
let ui_nodes_wy: i32;
let ui_nodes_ww: i32;
let ui_nodes_wh: i32;

let ui_nodes_ui: zui_t;
let ui_nodes_canvas_type = canvas_type_t.MATERIAL;
let ui_nodes_show_menu: bool = false;
let ui_nodes_show_menu_first: bool = true;
let ui_nodes_hide_menu: bool = false;
let ui_nodes_menu_category: i32 = 0;
let ui_nodes_popup_x: f32 = 0.0;
let ui_nodes_popup_y: f32 = 0.0;

let ui_nodes_uichanged_last: bool = false;
let ui_nodes_recompile_mat: bool = false; // Mat preview
let ui_nodes_recompile_mat_final: bool = false;
let ui_nodes_node_search_spawn: zui_node_t = null;
let ui_nodes_node_search_offset: i32 = 0;
let ui_nodes_last_canvas: zui_node_canvas_t = null;
let ui_nodes_last_node_selected_id: i32 = -1;
let ui_nodes_release_link: bool = false;
let ui_nodes_is_node_menu_op: bool = false;

let ui_nodes_grid: image_t = null;
let ui_nodes_hwnd: zui_handle_t = zui_handle_create();
let ui_nodes_group_stack: node_group_t[] = [];
let ui_nodes_controls_down: bool = false;

function ui_nodes_init() {
	zui_set_on_link_drag(ui_nodes_on_link_drag);
	zui_set_on_socket_released(ui_nodes_on_socket_released);
	zui_set_on_canvas_released(ui_nodes_on_canvas_released);
	zui_set_on_canvas_control(ui_nodes_on_canvas_control);

	let scale: f32 = config_raw.window_scale;
	ui_nodes_ui = zui_create({ theme: base_theme, font: base_font, color_wheel: base_color_wheel, black_white_gradient: base_color_wheel_gradient, scale_factor: scale });
	ui_nodes_ui.scroll_enabled = false;
}

function ui_nodes_on_link_drag(link_drag_id: i32, is_new_link: bool) {
	if (is_new_link) {
		let nodes: zui_nodes_t = ui_nodes_get_nodes();
		let link_drag: zui_node_link_t = zui_get_link(ui_nodes_get_canvas(true).links, link_drag_id);
		let node: zui_node_t = zui_get_node(ui_nodes_get_canvas(true).nodes, link_drag.from_id > -1 ? link_drag.from_id : link_drag.to_id);
		let link_x: i32 = ui_nodes_ui._window_x + zui_nodes_NODE_X(node);
		let link_y: i32 = ui_nodes_ui._window_y + zui_nodes_NODE_Y(node);
		if (link_drag.from_id > -1) {
			link_x += zui_nodes_NODE_W(node);
			link_y += zui_nodes_OUTPUT_Y(node.outputs, link_drag.from_socket);
		}
		else {
			link_y += zui_nodes_INPUT_Y(ui_nodes_get_canvas(true), node.inputs, link_drag.to_socket) + zui_nodes_OUTPUTS_H(node.outputs) + zui_nodes_BUTTONS_H(node);
		}
		if (math_abs(mouse_x - link_x) > 5 || math_abs(mouse_y - link_y) > 5) { // Link length
			ui_nodes_node_search(-1, -1, function () {
				let n: zui_node_t = zui_get_node(ui_nodes_get_canvas(true).nodes, nodes.nodes_selected_id[0]);
				if (link_drag.to_id == -1 && n.inputs.length > 0) {
					link_drag.to_id = n.id;
					let from_type: string = node.outputs[link_drag.from_socket].type;
					// Connect to the first socket
					link_drag.to_socket = 0;
					// Try to find the first type-matching socket and use it if present
					for (let socket of n.inputs) {
						if (socket.type == from_type) {
							link_drag.to_socket = n.inputs.indexOf(socket);
							break;
						}
					}
					ui_nodes_get_canvas(true).links.push(link_drag);
				}
				else if (link_drag.from_id == -1 && n.outputs.length > 0) {
					link_drag.from_id = n.id;
					link_drag.from_socket = 0;
					ui_nodes_get_canvas(true).links.push(link_drag);
				}
				///if is_lab
				ParserLogic.parse(ui_nodes_get_canvas(true));
				context_raw.rdirty = 5;
				///end
			});
		}
		// Selecting which node socket to preview
		else if (node.id == nodes.nodes_selected_id[0]) {
			context_raw.node_preview_socket = link_drag.from_id > -1 ? link_drag.from_socket : 0;
			///if (is_paint || is_sculpt)
			context_raw.node_preview_dirty = true;
			///end
		}
	}
}

function ui_nodes_on_socket_released(socket_id: i32) {
	let nodes: zui_nodes_t = ui_nodes_get_nodes();
	let canvas: zui_node_canvas_t = ui_nodes_get_canvas(true);
	let socket: zui_node_socket_t = zui_get_socket(canvas.nodes, socket_id);
	let node: zui_node_t = zui_get_node(canvas.nodes, socket.node_id);
	if (ui_nodes_ui.input_released_r) {
		if (node.type == "GROUP_INPUT" || node.type == "GROUP_OUTPUT") {
			base_notify_on_next_frame(function () {
				ui_menu_draw(function (ui: zui_t) {
					if (ui_menu_button(ui, tr("Edit"))) {
						let htype: zui_handle_t = zui_handle("uinodes_0");
						let hname: zui_handle_t = zui_handle("uinodes_1");
						let hmin: zui_handle_t = zui_handle("uinodes_2");
						let hmax: zui_handle_t = zui_handle("uinodes_3");
						let hval0: zui_handle_t = zui_handle("uinodes_4");
						let hval1: zui_handle_t = zui_handle("uinodes_5");
						let hval2: zui_handle_t = zui_handle("uinodes_6");
						let hval3: zui_handle_t = zui_handle("uinodes_7");
						htype.position = socket.type == "RGBA" ? 0 : socket.type == "VECTOR" ? 1 : 2;
						hname.text = socket.name;
						hmin.value = socket.min;
						hmax.value = socket.max;
						if (socket.type == "RGBA" || socket.type == "VECTOR") {
							hval0.value = socket.default_value[0];
							hval1.value = socket.default_value[1];
							hval2.value = socket.default_value[2];
							if (socket.type == "RGBA") {
								hval3.value = socket.default_value[3];
							}
						}
						else hval0.value = socket.default_value;
						base_notify_on_next_frame(function () {
							zui_end_input();
							ui_box_show_custom(function (ui: zui_t) {
								if (zui_tab(zui_handle("uinodes_8"), tr("Socket"))) {
									let type: i32 = zui_combo(htype, [tr("Color"), tr("Vector"), tr("Value")], tr("Type"), true);
									if (htype.changed) hname.text = type == 0 ? tr("Color") : type == 1 ? tr("Vector") : tr("Value");
									let name: string = zui_text_input(hname, tr("Name"));
									let min: f32 = zui_float_input(hmin, tr("Min"));
									let max: f32 = zui_float_input(hmax, tr("Max"));
									let default_value: any = null;
									if (type == 0) {
										zui_row([1 / 4, 1 / 4, 1 / 4, 1 / 4]);
										zui_float_input(hval0, tr("R"));
										zui_float_input(hval1, tr("G"));
										zui_float_input(hval2, tr("B"));
										zui_float_input(hval3, tr("A"));
										default_value = new Float32Array([hval0.value, hval1.value, hval2.value, hval3.value]);
									}
									else if (type == 1) {
										zui_row([1 / 3, 1 / 3, 1 / 3]);
										hval0.value = zui_float_input(hval0, tr("X"));
										hval1.value = zui_float_input(hval1, tr("Y"));
										hval2.value = zui_float_input(hval2, tr("Z"));
										default_value = new Float32Array([hval0.value, hval1.value, hval2.value]);
									}
									else {
										default_value = zui_float_input(hval0, tr("default_value"));
									}
									if (zui_button(tr("OK"))) { // || ui.isReturnDown
										socket.name = name;
										socket.type = type == 0 ? "RGBA" : type == 1 ? "VECTOR" : "VALUE";
										socket.color = NodesMaterial.get_socket_color(socket.type);
										socket.min = min;
										socket.max = max;
										socket.default_value = default_value;
										ui_box_hide();
										NodesMaterial.sync_sockets(node);
										ui_nodes_hwnd.redraws = 2;
									}
								}
							}, 400, 250);
						});
					}
					if (ui_menu_button(ui, tr("Delete"))) {
						let i: i32 = 0;
						// Remove links connected to the socket
						while (i < canvas.links.length) {
							let l: zui_node_link_t = canvas.links[i];
							if ((l.from_id == node.id && l.from_socket == node.outputs.indexOf(socket)) ||
								(l.to_id == node.id && l.to_socket == node.inputs.indexOf(socket))) {
								canvas.links.splice(i, 1);
							}
							else i++;
						}
						// Remove socket
						array_remove(node.inputs, socket);
						array_remove(node.outputs, socket);
						NodesMaterial.sync_sockets(node);
					}
				}, 2);
			});
		}
		else ui_nodes_on_canvas_released();
	}
	// Selecting which node socket to preview
	else if (node.id == nodes.nodes_selected_id[0]) {
		let i: i32 = node.outputs.indexOf(socket);
		if (i > -1) {
			context_raw.node_preview_socket = i;
			///if (is_paint || is_sculpt)
			context_raw.node_preview_dirty = true;
			///end
		}
	}
}

function ui_nodes_on_canvas_released() {
	if (ui_nodes_ui.input_released_r && math_abs(ui_nodes_ui.input_x - ui_nodes_ui.input_started_x) < 2 && math_abs(ui_nodes_ui.input_y - ui_nodes_ui.input_started_y) < 2) {
		// Node selection
		let nodes: zui_nodes_t = ui_nodes_get_nodes();
		let canvas: zui_node_canvas_t = ui_nodes_get_canvas(true);
		let selected: zui_node_t = null;
		for (let node of canvas.nodes) {
			if (zui_get_input_in_rect(ui_nodes_ui._window_x + zui_nodes_NODE_X(node), ui_nodes_ui._window_y + zui_nodes_NODE_Y(node), zui_nodes_NODE_W(node), zui_nodes_NODE_H(canvas, node))) {
				selected = node;
				break;
			}
		}
		if (selected == null) nodes.nodes_selected_id = [];
		else if (nodes.nodes_selected_id.indexOf(selected.id) == -1) nodes.nodes_selected_id = [selected.id];

		// Node context menu
		if (!zui_socket_released()) {
			let number_of_entries: i32 = 5;
			if (ui_nodes_canvas_type == canvas_type_t.MATERIAL) ++number_of_entries;
			if (selected != null && selected.type == "RGB") ++number_of_entries;

			ui_menu_draw(function (ui_menu: zui_t) {
				ui_menu._y += 1;
				let is_protected: bool = selected == null ||
								///if (is_paint || is_sculpt)
								selected.type == "OUTPUT_MATERIAL_PBR" ||
								///end
								selected.type == "GROUP_INPUT" ||
								selected.type == "GROUP_OUTPUT" ||
								selected.type == "BrushOutputNode";
				ui_menu.enabled = !is_protected;
				if (ui_menu_button(ui_menu, tr("Cut"), "ctrl+x")) {
					base_notify_on_next_frame(function () {
						ui_nodes_hwnd.redraws = 2;
						zui_set_is_copy(true);
						zui_set_is_cut(true);
						ui_nodes_is_node_menu_op = true;
					});
				}
				if (ui_menu_button(ui_menu, tr("Copy"), "ctrl+c")) {
					base_notify_on_next_frame(function () {
						zui_set_is_copy(true);
						ui_nodes_is_node_menu_op = true;
					});
				}
				ui_menu.enabled = zui_clipboard != "";
				if (ui_menu_button(ui_menu, tr("Paste"), "ctrl+v")) {
					base_notify_on_next_frame(function () {
						ui_nodes_hwnd.redraws = 2;
						zui_set_is_paste(true);
						ui_nodes_is_node_menu_op = true;
					});
				}
				ui_menu.enabled = !is_protected;
				if (ui_menu_button(ui_menu, tr("Delete"), "delete")) {
					base_notify_on_next_frame(function () {
						ui_nodes_hwnd.redraws = 2;
						ui_nodes_ui.is_delete_down = true;
						ui_nodes_is_node_menu_op = true;
					});
				}
				if (ui_menu_button(ui_menu, tr("Duplicate"))) {
					base_notify_on_next_frame(function () {
						ui_nodes_hwnd.redraws = 2;
						zui_set_is_copy(true);
						zui_set_is_paste(true);
						ui_nodes_is_node_menu_op = true;
					});
				}
				if (selected != null && selected.type == "RGB") {
					if (ui_menu_button(ui_menu, tr("Add Swatch"))) {
						let color: any = selected.outputs[0].default_value;
						let new_swatch: swatch_color_t = make_swatch(color_from_floats(color[0], color[1], color[2], color[3]));
						context_set_swatch(new_swatch);
						project_raw.swatches.push(new_swatch);
						ui_base_hwnds[tab_area_t.STATUS].redraws = 1;
					}
				}

				if (ui_nodes_canvas_type == canvas_type_t.MATERIAL) {
					ui_menu_separator(ui_menu);
					if (ui_menu_button(ui_menu, tr("2D View"))) {
						ui_base_show_2d_view(view_2d_type_t.NODE);
					}
				}

				ui_menu.enabled = true;
			}, number_of_entries);
		}
	}

	if (ui_nodes_ui.input_released) {
		let nodes: zui_nodes_t = ui_nodes_get_nodes();
		let canvas: zui_node_canvas_t = ui_nodes_get_canvas(true);
		for (let node of canvas.nodes) {
			if (zui_get_input_in_rect(ui_nodes_ui._window_x + zui_nodes_NODE_X(node), ui_nodes_ui._window_y + zui_nodes_NODE_Y(node), zui_nodes_NODE_W(node), zui_nodes_NODE_H(canvas, node))) {
				if (node.id == nodes.nodes_selected_id[0]) {
					ui_view2d_hwnd.redraws = 2;
					if (time_time() - context_raw.select_time < 0.25) ui_base_show_2d_view(view_2d_type_t.NODE);
					context_raw.select_time = time_time();
				}
				break;
			}
		}
	}
}

function ui_nodes_on_canvas_control(): zui_canvas_control_t {
	let control: zui_canvas_control_t = ui_nodes_get_canvas_control(ui_nodes_ui, ui_nodes_controls_down);
	ui_nodes_controls_down = control.controls_down;
	return control;
}

function ui_nodes_get_canvas_control(ui: zui_t, controls_down: bool): zui_canvas_control_t {
	if (config_raw.wrap_mouse && controls_down) {
		if (ui.input_x < ui._window_x) {
			ui.input_x = ui._window_x + ui._window_w;
			krom_set_mouse_position(math_floor(ui.input_x), math_floor(ui.input_y));
		}
		else if (ui.input_x > ui._window_x + ui._window_w) {
			ui.input_x = ui._window_x;
			krom_set_mouse_position(math_floor(ui.input_x), math_floor(ui.input_y));
		}
		else if (ui.input_y < ui._window_y) {
			ui.input_y = ui._window_y + ui._window_h;
			krom_set_mouse_position(math_floor(ui.input_x), math_floor(ui.input_y));
		}
		else if (ui.input_y > ui._window_y + ui._window_h) {
			ui.input_y = ui._window_y;
			krom_set_mouse_position(math_floor(ui.input_x), math_floor(ui.input_y));
		}
	}

	if (operator_shortcut(config_keymap.action_pan, shortcut_type_t.STARTED) ||
		operator_shortcut(config_keymap.action_zoom, shortcut_type_t.STARTED) ||
		ui.input_started_r ||
		ui.input_wheel_delta != 0.0) {
		controls_down = true;
	}
	else if (!operator_shortcut(config_keymap.action_pan, shortcut_type_t.DOWN) &&
		!operator_shortcut(config_keymap.action_zoom, shortcut_type_t.DOWN) &&
		!ui.input_down_r &&
		ui.input_wheel_delta == 0.0) {
		controls_down = false;
	}
	if (!controls_down) {
		return {
			pan_x: 0,
			pan_y: 0,
			zoom: 0,
			controls_down: controls_down
		}
	}

	let pan: bool = ui.input_down_r || operator_shortcut(config_keymap.action_pan, shortcut_type_t.DOWN);
	let zoom_delta: f32 = operator_shortcut(config_keymap.action_zoom, shortcut_type_t.DOWN) ? ui_nodes_get_zoom_delta(ui) / 100.0 : 0.0;
	let control: zui_canvas_control_t = {
		pan_x: pan ? ui.input_dx : 0.0,
		pan_y: pan ? ui.input_dy : 0.0,
		zoom: ui.input_wheel_delta != 0.0 ? -ui.input_wheel_delta / 10 : zoom_delta,
		controls_down: controls_down
	};
	if (base_is_combo_selected()) control.zoom = 0.0;
	return control;
}

function ui_nodes_get_zoom_delta(ui: zui_t): f32 {
	return config_raw.zoom_direction == zoom_direction_t.VERTICAL ? -ui.input_dy :
			config_raw.zoom_direction == zoom_direction_t.VERTICAL_INVERTED ? -ui.input_dy :
			config_raw.zoom_direction == zoom_direction_t.HORIZONTAL ? ui.input_dx :
			config_raw.zoom_direction == zoom_direction_t.HORIZONTAL_INVERTED ? ui.input_dx :
			-(ui.input_dy - ui.input_dx);
}

function ui_nodes_get_canvas(groups: bool = false): zui_node_canvas_t {
	///if (is_paint || is_sculpt)
	if (ui_nodes_canvas_type == canvas_type_t.MATERIAL) {
		if (groups && ui_nodes_group_stack.length > 0) return ui_nodes_group_stack[ui_nodes_group_stack.length - 1].canvas;
		else return ui_nodes_get_canvas_material();
	}
	else return context_raw.brush.canvas;
	///end

	///if is_lab
	return project_canvas;
	///end
}

///if (is_paint || is_sculpt)
function ui_nodes_get_canvas_material(): zui_node_canvas_t {
	return context_raw.material.canvas;
}
///end

function ui_nodes_get_nodes(): zui_nodes_t {
	///if (is_paint || is_sculpt)
	if (ui_nodes_canvas_type == canvas_type_t.MATERIAL) {
		if (ui_nodes_group_stack.length > 0) return ui_nodes_group_stack[ui_nodes_group_stack.length - 1].nodes;
		else return context_raw.material.nodes;
	}
	else return context_raw.brush.nodes;
	///end

	///if is_lab
	if (ui_nodes_group_stack.length > 0) return ui_nodes_group_stack[ui_nodes_group_stack.length - 1].nodes;
	else return project_nodes;
	///end
}

function ui_nodes_update() {
	if (!ui_nodes_show || !base_ui_enabled) return;

	///if (is_paint || is_sculpt)
	ui_nodes_wx = math_floor(app_w()) + ui_toolbar_w;
	///end
	///if is_lab
	ui_nodes_wx = math_floor(app_w());
	///end
	ui_nodes_wy = ui_header_h * 2;

	if (ui_view2d_show) {
		ui_nodes_wy += app_h() - config_raw.layout[layout_size_t.NODES_H];
	}

	let ww: i32 = config_raw.layout[layout_size_t.NODES_W];
	if (!ui_base_show) {
		///if (is_paint || is_sculpt)
		ww += config_raw.layout[layout_size_t.SIDEBAR_W] + ui_toolbar_w;
		ui_nodes_wx -= ui_toolbar_w;
		///end
		ui_nodes_wy = 0;
	}

	let mx: i32 = mouse_x;
	let my: i32 = mouse_y;
	if (mx < ui_nodes_wx || mx > ui_nodes_wx + ww || my < ui_nodes_wy) return;
	if (ui_nodes_ui.is_typing || !ui_nodes_ui.input_enabled) return;

	let nodes: zui_nodes_t = ui_nodes_get_nodes();
	if (nodes.nodes_selected_id.length > 0 && ui_nodes_ui.is_key_pressed) {
		if (ui_nodes_ui.key == key_code_t.LEFT) for (let n of nodes.nodes_selected_id) zui_get_node(ui_nodes_get_canvas(true).nodes, n).x -= 1;
		else if (ui_nodes_ui.key == key_code_t.RIGHT) for (let n of nodes.nodes_selected_id) zui_get_node(ui_nodes_get_canvas(true).nodes, n).x += 1;
		if (ui_nodes_ui.key == key_code_t.UP) for (let n of nodes.nodes_selected_id) zui_get_node(ui_nodes_get_canvas(true).nodes, n).y -= 1;
		else if (ui_nodes_ui.key == key_code_t.DOWN) for (let n of nodes.nodes_selected_id) zui_get_node(ui_nodes_get_canvas(true).nodes, n).y += 1;
	}

	// Node search popup
	if (operator_shortcut(config_keymap.node_search)) ui_nodes_node_search();
	if (ui_nodes_node_search_spawn != null) {
		ui_nodes_ui.input_x = mouse_x; // Fix inputDX after popup removal
		ui_nodes_ui.input_y = mouse_y;
		ui_nodes_node_search_spawn = null;
	}

	if (operator_shortcut(config_keymap.view_reset)) {
		nodes.panX = 0.0;
		nodes.panY = 0.0;
		nodes.zoom = 1.0;
	}
}

function ui_nodes_canvas_changed() {
	ui_nodes_recompile_mat = true;
	ui_nodes_recompile_mat_final = true;
}

function ui_nodes_node_search(x: i32 = -1, y: i32 = -1, done: ()=>void = null) {
	let search_handle: zui_handle_t = zui_handle("uinodes_9");
	let first: bool = true;
	ui_menu_draw(function (ui: zui_t) {
		g2_set_color(ui.t.SEPARATOR_COL);
		zui_draw_rect(true, ui._x, ui._y, ui._w, zui_ELEMENT_H(ui) * 8);
		g2_set_color(0xffffffff);

		let search: string = zui_text_input(search_handle, "", zui_align_t.LEFT, true, true).toLowerCase();
		ui.changed = false;
		if (first) {
			first = false;
			search_handle.text = "";
			zui_start_text_edit(search_handle); // Focus search bar
		}

		if (search_handle.changed) ui_nodes_node_search_offset = 0;

		if (ui.is_key_pressed) { // Move selection
			if (ui.key == key_code_t.DOWN && ui_nodes_node_search_offset < 6) ui_nodes_node_search_offset++;
			if (ui.key == key_code_t.UP && ui_nodes_node_search_offset > 0) ui_nodes_node_search_offset--;
		}
		let enter: bool = keyboard_down("enter");
		let count: i32 = 0;
		let BUTTON_COL: i32 = ui.t.BUTTON_COL;

		///if (is_paint || is_sculpt)
		let node_list: zui_node_t[][] = ui_nodes_canvas_type == canvas_type_t.MATERIAL ? NodesMaterial.list : NodesBrush.list;
		///end
		///if is_lab
		let node_list: zui_node_t[][] = NodesBrush.list;
		///end

		for (let list of node_list) {
			for (let n of list) {
				if (tr(n.name).toLowerCase().indexOf(search) >= 0) {
					ui.t.BUTTON_COL = count == ui_nodes_node_search_offset ? ui.t.HIGHLIGHT_COL : ui.t.SEPARATOR_COL;
					if (zui_button(tr(n.name), zui_align_t.LEFT) || (enter && count == ui_nodes_node_search_offset)) {
						ui_nodes_push_undo();
						let nodes: zui_nodes_t = ui_nodes_get_nodes();
						let canvas: zui_node_canvas_t = ui_nodes_get_canvas(true);
						ui_nodes_node_search_spawn = ui_nodes_make_node(n, nodes, canvas); // Spawn selected node
						canvas.nodes.push(ui_nodes_node_search_spawn);
						nodes.nodes_selected_id = [ui_nodes_node_search_spawn.id];
						nodes.nodesDrag = true;

						///if is_lab
						ParserLogic.parse(canvas);
						///end

						ui_nodes_hwnd.redraws = 2;
						if (enter) {
							ui.changed = true;
							count = 6; // Trigger break
						}
						if (done != null) done();
					}
					if (++count > 6) break;
				}
			}
			if (count > 6) break;
		}
		if (enter && count == 0) { // Hide popup on enter when node is not found
			ui.changed = true;
			search_handle.text = "";
		}
		ui.t.BUTTON_COL = BUTTON_COL;
	}, 8, x, y);
}

function ui_nodes_get_node_x(): i32 {
	return math_floor((mouse_x - ui_nodes_wx - zui_nodes_PAN_X()) / zui_nodes_SCALE());
}

function ui_nodes_get_node_y(): i32 {
	return math_floor((mouse_y - ui_nodes_wy - zui_nodes_PAN_Y()) / zui_nodes_SCALE());
}

function ui_nodes_draw_grid() {
	let ww: i32 = config_raw.layout[layout_size_t.NODES_W];

	///if (is_paint || is_sculpt)
	if (!ui_base_show) {
		ww += config_raw.layout[layout_size_t.SIDEBAR_W] + ui_toolbar_w;
	}
	///end

	let wh: i32 = app_h();
	let step: f32 = 100 * zui_SCALE(ui_nodes_ui);
	let w: i32 = math_floor(ww + step * 3);
	let h: i32 = math_floor(wh + step * 3);
	if (w < 1) w = 1;
	if (h < 1) h = 1;
	ui_nodes_grid = image_create_render_target(w, h);
	g2_begin(ui_nodes_grid);
	g2_clear(ui_nodes_ui.t.SEPARATOR_COL);

	g2_set_color(ui_nodes_ui.t.SEPARATOR_COL - 0x00050505);
	step = 20 * zui_SCALE(ui_nodes_ui);
	for (let i: i32 = 0; i < math_floor(h / step) + 1; ++i) {
		g2_draw_line(0, i * step, w, i * step);
	}
	for (let i: i32 = 0; i < math_floor(w / step) + 1; ++i) {
		g2_draw_line(i * step, 0, i * step, h);
	}

	g2_set_color(ui_nodes_ui.t.SEPARATOR_COL - 0x00090909);
	step = 100 * zui_SCALE(ui_nodes_ui);
	for (let i: i32 = 0; i < math_floor(h / step) + 1; ++i) {
		g2_draw_line(0, i * step, w, i * step);
	}
	for (let i: i32 = 0; i < math_floor(w / step) + 1; ++i) {
		g2_draw_line(i * step, 0, i * step, h);
	}

	g2_end();
}

function ui_nodes_render() {
	if (ui_nodes_recompile_mat) {
		///if (is_paint || is_sculpt)
		if (ui_nodes_canvas_type == canvas_type_t.BRUSH) {
			MakeMaterial.parse_brush();
			util_render_make_brush_preview();
			ui_base_hwnds[tab_area_t.SIDEBAR1].redraws = 2;
		}
		else {
			base_is_fill_material() ? base_update_fill_layers() : util_render_make_material_preview();
			if (ui_view2d_show && ui_view2d_type == view_2d_type_t.NODE) {
				ui_view2d_hwnd.redraws = 2;
			}
		}

		ui_base_hwnds[tab_area_t.SIDEBAR1].redraws = 2;
		if (context_raw.split_view) context_raw.ddirty = 2;
		///end

		///if is_lab
		ParserLogic.parse(project_canvas);
		///end

		ui_nodes_recompile_mat = false;
	}
	else if (ui_nodes_recompile_mat_final) {
		///if (is_paint || is_sculpt)
		MakeMaterial.parse_paint_material();

		if (ui_nodes_canvas_type == canvas_type_t.MATERIAL && base_is_fill_material()) {
			base_update_fill_layers();
			util_render_make_material_preview();
		}

		let decal: bool = context_raw.tool == workspace_tool_t.DECAL || context_raw.tool == workspace_tool_t.TEXT;
		if (decal) util_render_make_decal_preview();

		ui_base_hwnds[tab_area_t.SIDEBAR0].redraws = 2;
		context_raw.node_preview_dirty = true;
		///end

		ui_nodes_recompile_mat_final = false;
	}

	let nodes: zui_nodes_t = ui_nodes_get_nodes();
	if (nodes.nodes_selected_id.length > 0 && nodes.nodes_selected_id[0] != ui_nodes_last_node_selected_id) {
		ui_nodes_last_node_selected_id = nodes.nodes_selected_id[0];
		///if (is_paint || is_sculpt)
		context_raw.node_preview_dirty = true;
		///end

		///if is_lab
		context_raw.ddirty = 2; // Show selected node texture in viewport
		ui_header_handle.redraws = 2;
		///end

		context_raw.node_preview_socket = 0;
	}

	// Remove dragged link when mouse is released out of the node viewport
	let c: zui_node_canvas_t = ui_nodes_get_canvas(true);
	if (ui_nodes_release_link && nodes.linkDragId != -1) {
		array_remove(c.links, zui_get_link(c.links, nodes.linkDragId));
		nodes.linkDragId = -1;
	}
	ui_nodes_release_link = ui_nodes_ui.input_released;

	if (!ui_nodes_show || sys_width() == 0 || sys_height() == 0) return;

	ui_nodes_ui.input_enabled = base_ui_enabled;

	g2_end();

	if (ui_nodes_grid == null) ui_nodes_draw_grid();

	///if (is_paint || is_sculpt)
	if (config_raw.node_preview && context_raw.node_preview_dirty) {
		ui_nodes_make_node_preview();
	}
	///end

	// Start with UI
	zui_begin(ui_nodes_ui);

	// Make window
	ui_nodes_ww = config_raw.layout[layout_size_t.NODES_W];

	///if (is_paint || is_sculpt)
	ui_nodes_wx = math_floor(app_w()) + ui_toolbar_w;
	///end
	///if is_lab
	ui_nodes_wx = math_floor(app_w());
	///end

	ui_nodes_wy = 0;

	///if (is_paint || is_sculpt)
	if (!ui_base_show) {
		ui_nodes_ww += config_raw.layout[layout_size_t.SIDEBAR_W] + ui_toolbar_w;
		ui_nodes_wx -= ui_toolbar_w;
	}
	///end

	let ew: i32 = math_floor(zui_ELEMENT_W(ui_nodes_ui) * 0.7);
	ui_nodes_wh = app_h() + ui_header_h;
	if (config_raw.layout[layout_size_t.HEADER] == 1) ui_nodes_wh += ui_header_h;

	if (ui_view2d_show) {
		ui_nodes_wh = config_raw.layout[layout_size_t.NODES_H];
		ui_nodes_wy = app_h() - config_raw.layout[layout_size_t.NODES_H] + ui_header_h;
		if (config_raw.layout[layout_size_t.HEADER] == 1) ui_nodes_wy += ui_header_h;
		if (!ui_base_show) {
			ui_nodes_wy -= ui_header_h * 2;
		}
	}

	if (zui_window(ui_nodes_hwnd, ui_nodes_wx, ui_nodes_wy, ui_nodes_ww, ui_nodes_wh)) {

		zui_tab(zui_handle("uinodes_10"), tr("Nodes"));

		// Grid
		g2_set_color(0xffffffff);
		let step: f32 = 100 * zui_SCALE(ui_nodes_ui);
		g2_draw_image(ui_nodes_grid, (nodes.panX * zui_nodes_SCALE()) % step - step, (nodes.panY * zui_nodes_SCALE()) % step - step);

		// Undo
		if (ui_nodes_ui.input_started || ui_nodes_ui.is_key_pressed) {
			ui_nodes_last_canvas = json_parse(json_stringify(ui_nodes_get_canvas(true)));
		}

		// Nodes
		let _input_enabled: bool = ui_nodes_ui.input_enabled;
		ui_nodes_ui.input_enabled = _input_enabled && !ui_nodes_show_menu;
		///if (is_paint || is_sculpt)
		ui_nodes_ui.window_border_right = config_raw.layout[layout_size_t.SIDEBAR_W];
		///end
		ui_nodes_ui.window_border_top = ui_header_h * 2;
		ui_nodes_ui.window_border_bottom = config_raw.layout[layout_size_t.STATUS_H];
		zui_node_canvas(nodes, ui_nodes_ui, c);
		ui_nodes_ui.input_enabled = _input_enabled;

		if (nodes.colorPickerCallback != null) {
			context_raw.color_picker_previous_tool = context_raw.tool;
			context_select_tool(workspace_tool_t.PICKER);
			let tmp: (col: i32)=>void = nodes.colorPickerCallback;
			context_raw.color_picker_callback = function (color: swatch_color_t) {
				tmp(color.base);
				ui_nodes_hwnd.redraws = 2;

				///if (is_paint || is_sculpt)
				let material_live: bool = config_raw.material_live;
				///end
				///if is_lab
				let material_live: bool = true;
				///end

				if (material_live) {
					ui_nodes_canvas_changed();
				}
			};
			nodes.colorPickerCallback = null;
		}

		// Remove nodes with unknown id for this canvas type
		if (zui_is_paste) {
			///if (is_paint || is_sculpt)
			let node_list: zui_node_t[][] = ui_nodes_canvas_type == canvas_type_t.MATERIAL ? NodesMaterial.list : NodesBrush.list;
			///end
			///if is_lab
			let node_list: zui_node_t[][] = NodesBrush.list;
			///end

			let i: i32 = 0;
			while (i++ < c.nodes.length) {
				let canvas_node: zui_node_t = c.nodes[i - 1];
				if (zui_exclude_remove.indexOf(canvas_node.type) >= 0) {
					continue;
				}
				let found: bool = false;
				for (let list of node_list) {
					for (let list_node of list) {
						if (canvas_node.type == list_node.type) {
							found = true;
							break;
						}
					}
					if (found) break;
				}
				if (canvas_node.type == "GROUP" && !ui_nodes_can_place_group(canvas_node.name)) {
					found = false;
				}
				if (!found) {
					zui_remove_node(canvas_node, c);
					array_remove(nodes.nodes_selected_id, canvas_node.id);
					i--;
				}
			}
		}

		if (ui_nodes_is_node_menu_op) {
			zui_set_is_copy(false);
			zui_set_is_cut(false);
			zui_set_is_paste(false);
			ui_nodes_ui.is_delete_down = false;
		}

		// Recompile material on change
		if (ui_nodes_ui.changed) {
			///if (is_paint || is_sculpt)
			ui_nodes_recompile_mat = (ui_nodes_ui.input_dx != 0 || ui_nodes_ui.input_dy != 0 || !ui_nodes_uichanged_last) && config_raw.material_live; // Instant preview
			///end
			///if is_lab
			ui_nodes_recompile_mat = (ui_nodes_ui.input_dx != 0 || ui_nodes_ui.input_dy != 0 || !ui_nodes_uichanged_last); // Instant preview
			///end
		}
		else if (ui_nodes_uichanged_last) {
			ui_nodes_canvas_changed();
			ui_nodes_push_undo(ui_nodes_last_canvas);
		}
		ui_nodes_uichanged_last = ui_nodes_ui.changed;

		// Node previews
		if (config_raw.node_preview && nodes.nodes_selected_id.length > 0) {
			let img: image_t = null;
			let sel: zui_node_t = zui_get_node(c.nodes, nodes.nodes_selected_id[0]);

			///if (is_paint || is_sculpt)

			let single_channel: bool = sel.type == "LAYER_MASK";
			if (sel.type == "LAYER" || sel.type == "LAYER_MASK") {
				let id: any = sel.buttons[0].default_value;
				if (id < project_layers.length) {
					///if is_paint
					img = project_layers[id].texpaint_preview;
					///end
				}
			}
			else if (sel.type == "MATERIAL") {
				let id: any = sel.buttons[0].default_value;
				if (id < project_materials.length) {
					img = project_materials[id].image;
				}
			}
			else if (sel.type == "OUTPUT_MATERIAL_PBR") {
				img = context_raw.material.image;
			}
			else if (sel.type == "BrushOutputNode") {
				img = context_raw.brush.image;
			}
			else if (ui_nodes_canvas_type == canvas_type_t.MATERIAL) {
				img = context_raw.node_preview;
			}

			///else

			let brush_node: LogicNode = ParserLogic.get_logic_node(sel);
			if (brush_node != null) {
				img = brush_node.get_cached_image();
			}

			///end

			if (img != null) {
				let tw: f32 = 128 * zui_SCALE(ui_nodes_ui);
				let th: f32 = tw * (img.height / img.width);
				let tx: f32 = ui_nodes_ww - tw - 8 * zui_SCALE(ui_nodes_ui);
				let ty: f32 = ui_nodes_wh - th - 8 * zui_SCALE(ui_nodes_ui);

				///if krom_opengl
				let invert_y: bool = sel.type == "MATERIAL";
				///else
				let invert_y: bool = false;
				///end

				///if (is_paint || is_sculpt)
				if (single_channel) {
					g2_set_pipeline(ui_view2d_pipe);
					///if krom_opengl
					krom_g4_set_pipeline(ui_view2d_pipe.pipeline_);
					///end
					krom_g4_set_int(ui_view2d_channel_loc, 1);
				}
				///end

				g2_set_color(0xffffffff);
				invert_y ?
					g2_draw_scaled_image(img, tx, ty + th, tw, -th) :
					g2_draw_scaled_image(img, tx, ty, tw, th);

				///if (is_paint || is_sculpt)
				if (single_channel) {
					g2_set_pipeline(null);
				}
				///end
			}
		}

		// Menu
		g2_set_color(ui_nodes_ui.t.SEPARATOR_COL);
		g2_fill_rect(0, zui_ELEMENT_H(ui_nodes_ui), ui_nodes_ww, zui_ELEMENT_H(ui_nodes_ui) + zui_ELEMENT_OFFSET(ui_nodes_ui) * 2);
		g2_set_color(0xffffffff);

		let start_y: i32 = zui_ELEMENT_H(ui_nodes_ui) + zui_ELEMENT_OFFSET(ui_nodes_ui);
		ui_nodes_ui._x = 0;
		ui_nodes_ui._y = 2 + start_y;
		ui_nodes_ui._w = ew;

		///if (is_paint || is_sculpt)
		// Editable canvas name
		let h: zui_handle_t = zui_handle("uinodes_11");
		h.text = c.name;
		ui_nodes_ui._w = math_floor(math_min(g2_font_width(ui_nodes_ui.font, ui_nodes_ui.font_size, h.text) + 15 * zui_SCALE(ui_nodes_ui), 100 * zui_SCALE(ui_nodes_ui)));
		let new_name: string = zui_text_input(h, "");
		ui_nodes_ui._x += ui_nodes_ui._w + 3;
		ui_nodes_ui._y = 2 + start_y;
		ui_nodes_ui._w = ew;

		if (h.changed) { // Check whether renaming is possible and update group links
			if (ui_nodes_group_stack.length > 0) {
				let can_rename: bool = true;
				for (let m of project_material_groups) {
					if (m.canvas.name == new_name) can_rename = false; // Name already used
				}

				if (can_rename) {
					let old_name: string = c.name;
					c.name = new_name;
					let canvases: zui_node_canvas_t[] = [];
					for (let m of project_materials) canvases.push(m.canvas);
					for (let m of project_material_groups) canvases.push(m.canvas);
					for (let canvas of canvases) {
						for (let n of canvas.nodes) {
							if (n.type == "GROUP" && n.name == old_name) {
								n.name = c.name;
							}
						}
					}
				}
			}
			else {
				c.name = new_name;
			}
		}
		///end

		///if is_lab
		ui_nodes_ui.window_border_top = 0;
		UINodesExt.drawButtons(ew, start_y);
		///end

		let _BUTTON_COL: i32 = ui_nodes_ui.t.BUTTON_COL;
		ui_nodes_ui.t.BUTTON_COL = ui_nodes_ui.t.SEPARATOR_COL;

		///if (is_paint || is_sculpt)
		let cats: string[] = ui_nodes_canvas_type == canvas_type_t.MATERIAL ? NodesMaterial.categories : NodesBrush.categories;
		///end
		///if is_lab
		let cats: string[] = NodesBrush.categories;
		///end

		for (let i: i32 = 0; i < cats.length; ++i) {
			if ((zui_menu_button(tr(cats[i]))) || (ui_nodes_ui.is_hovered && ui_nodes_show_menu)) {
				ui_nodes_show_menu = true;
				ui_nodes_menu_category = i;
				ui_nodes_popup_x = ui_nodes_wx + ui_nodes_ui._x;
				ui_nodes_popup_y = ui_nodes_wy + ui_nodes_ui._y;
				if (config_raw.touch_ui) {
					ui_nodes_show_menu_first = true;
					let menuw: i32 = math_floor(ew * 2.3);
					ui_nodes_popup_x -= menuw / 2;
					ui_nodes_popup_x += ui_nodes_ui._w / 2;
				}
				ui_menu_category_w = ui_nodes_ui._w;
				ui_menu_category_h = math_floor(zui_MENUBAR_H(ui_nodes_ui));
			}
			ui_nodes_ui._x += ui_nodes_ui._w + 3;
			ui_nodes_ui._y = 2 + start_y;
		}

		if (config_raw.touch_ui) {
			let _w: i32 = ui_nodes_ui._w;
			ui_nodes_ui._w = math_floor(36 * zui_SCALE(ui_nodes_ui));
			ui_nodes_ui._y = 4 * zui_SCALE(ui_nodes_ui) + start_y;
			if (ui_menubar_icon_button(ui_nodes_ui, 2, 3)) {
				ui_nodes_node_search(math_floor(ui_nodes_ui._window_x + ui_nodes_ui._x), math_floor(ui_nodes_ui._window_y + ui_nodes_ui._y));
			}
			ui_nodes_ui._w = _w;
		}
		else {
			if (zui_menu_button(tr("Search"))) {
				ui_nodes_node_search(math_floor(ui_nodes_ui._window_x + ui_nodes_ui._x), math_floor(ui_nodes_ui._window_y + ui_nodes_ui._y));
			}
		}
		if (ui_nodes_ui.is_hovered) {
			zui_tooltip(tr("Search for nodes") + ` (${config_keymap.node_search})`);
		}
		ui_nodes_ui._x += ui_nodes_ui._w + 3;
		ui_nodes_ui._y = 2 + start_y;

		ui_nodes_ui.t.BUTTON_COL = _BUTTON_COL;

		// Close node group
		if (ui_nodes_group_stack.length > 0 && zui_menu_button(tr("Close"))) {
			ui_nodes_group_stack.pop();
		}
	}

	zui_end(!ui_nodes_show_menu);

	g2_begin(null);

	if (ui_nodes_show_menu) {
		///if (is_paint || is_sculpt)
		let list:zui_node_t[][] = ui_nodes_canvas_type == canvas_type_t.MATERIAL ? NodesMaterial.list : NodesBrush.list;
		///end
		///if is_lab
		let list:zui_node_t[][] = NodesBrush.list;
		///end

		let num_nodes: i32 = list[ui_nodes_menu_category].length;

		///if (is_paint || is_sculpt)
		let is_group_category: bool = ui_nodes_canvas_type == canvas_type_t.MATERIAL && NodesMaterial.categories[ui_nodes_menu_category] == "Group";
		///end
		///if is_lab
		let is_group_category: bool = NodesMaterial.categories[ui_nodes_menu_category] == "Group";
		///end

		if (is_group_category) num_nodes += project_material_groups.length;

		let py: i32 = ui_nodes_popup_y;
		let menuw: i32 = math_floor(ew * 2.3);
		zui_begin_region(ui_nodes_ui, math_floor(ui_nodes_popup_x), math_floor(py), menuw);
		let _BUTTON_COL: i32 = ui_nodes_ui.t.BUTTON_COL;
		ui_nodes_ui.t.BUTTON_COL = ui_nodes_ui.t.SEPARATOR_COL;
		let _ELEMENT_OFFSET: i32 = ui_nodes_ui.t.ELEMENT_OFFSET;
		ui_nodes_ui.t.ELEMENT_OFFSET = 0;
		let _ELEMENT_H: i32 = ui_nodes_ui.t.ELEMENT_H;
		ui_nodes_ui.t.ELEMENT_H = config_raw.touch_ui ? (28 + 2) : 28;

		ui_menu_start(ui_nodes_ui);

		for (let n of list[ui_nodes_menu_category]) {
			if (ui_menu_button(ui_nodes_ui, tr(n.name))) {
				ui_nodes_push_undo();
				let canvas: zui_node_canvas_t = ui_nodes_get_canvas(true);
				let nodes: zui_nodes_t = ui_nodes_get_nodes();
				let node: zui_node_t = ui_nodes_make_node(n, nodes, canvas);
				canvas.nodes.push(node);
				nodes.nodes_selected_id = [node.id];
				nodes.nodesDrag = true;
				///if is_lab
				ParserLogic.parse(canvas);
				///end
			}
			// Next column
			if (ui_nodes_ui._y - ui_nodes_wy + zui_ELEMENT_H(ui_nodes_ui) / 2 > ui_nodes_wh) {
				ui_nodes_ui._x += menuw;
				ui_nodes_ui._y = py;
			}
		}
		if (is_group_category) {
			for (let g of project_material_groups) {
				zui_fill(0, 1, ui_nodes_ui._w / zui_SCALE(ui_nodes_ui), ui_nodes_ui.t.BUTTON_H + 2, ui_nodes_ui.t.ACCENT_SELECT_COL);
				zui_fill(1, 1, ui_nodes_ui._w / zui_SCALE(ui_nodes_ui) - 2, ui_nodes_ui.t.BUTTON_H + 1, ui_nodes_ui.t.SEPARATOR_COL);
				ui_nodes_ui.enabled = ui_nodes_can_place_group(g.canvas.name);
				ui_menu_fill(ui_nodes_ui);
				zui_row([5 / 6, 1 / 6]);
				if (zui_button(config_button_spacing + g.canvas.name, zui_align_t.LEFT)) {
					ui_nodes_push_undo();
					let canvas: zui_node_canvas_t = ui_nodes_get_canvas(true);
					let nodes: zui_nodes_t = ui_nodes_get_nodes();
					let node: zui_node_t = ui_nodes_make_group_node(g.canvas, nodes, canvas);
					canvas.nodes.push(node);
					nodes.nodes_selected_id = [node.id];
					nodes.nodesDrag = true;
				}

				///if (is_paint || is_sculpt)
				ui_nodes_ui.enabled = !project_is_material_group_in_use(g);
				if (zui_button("x", zui_align_t.CENTER)) {
					history_delete_material_group(g);
					array_remove(project_material_groups, g);
				}
				///end

				ui_nodes_ui.enabled = true;
			}
		}

		ui_nodes_hide_menu = ui_nodes_ui.combo_selected_handle_ptr == 0 && !ui_nodes_show_menu_first && (ui_nodes_ui.changed || ui_nodes_ui.input_released || ui_nodes_ui.input_released_r || ui_nodes_ui.is_escape_down);
		ui_nodes_show_menu_first = false;

		ui_nodes_ui.t.BUTTON_COL = _BUTTON_COL;
		ui_nodes_ui.t.ELEMENT_OFFSET = _ELEMENT_OFFSET;
		ui_nodes_ui.t.ELEMENT_H = _ELEMENT_H;
		zui_end_region();
	}

	if (ui_nodes_hide_menu) {
		ui_nodes_show_menu = false;
		ui_nodes_show_menu_first = true;
	}
}

function ui_nodes_contains_node_group_recursive(group: node_group_t, group_name: string): bool {
	if (group.canvas.name == group_name) {
		return true;
	}
	for (let n of group.canvas.nodes) {
		if (n.type == "GROUP") {
			let g: node_group_t = project_get_material_group_by_name(n.name);
			if (g != null && ui_nodes_contains_node_group_recursive(g, group_name)) {
				return true;
			}
		}
	}
	return false;
}

function ui_nodes_can_place_group(group_name: string): bool {
	// Prevent Recursive node groups
	// The group to place must not contain the current group or a group that contains the current group
	if (ui_nodes_group_stack.length > 0) {
		for (let g of ui_nodes_group_stack) {
			if (ui_nodes_contains_node_group_recursive(project_get_material_group_by_name(group_name), g.canvas.name)) return false;
		}
	}
	// Group was deleted / renamed
	let group_exists: bool = false;
	for (let group of project_material_groups) {
		if (group_name == group.canvas.name) {
			group_exists = true;
		}
	}
	if (!group_exists) return false;
	return true;
}

function ui_nodes_push_undo(last_canvas: zui_node_canvas_t = null) {
	if (last_canvas == null) last_canvas = ui_nodes_get_canvas(true);
	let canvas_group: i32 = ui_nodes_group_stack.length > 0 ? project_material_groups.indexOf(ui_nodes_group_stack[ui_nodes_group_stack.length - 1]) : null;

	///if (is_paint || is_sculpt)
	ui_base_hwnds[tab_area_t.SIDEBAR0].redraws = 2;
	history_edit_nodes(last_canvas, ui_nodes_canvas_type, canvas_group);
	///end
	///if is_lab
	history_edit_nodes(last_canvas, canvas_group);
	///end
}

function ui_nodes_accept_asset_drag(index: i32) {
	ui_nodes_push_undo();
	let g: node_group_t = ui_nodes_group_stack.length > 0 ? ui_nodes_group_stack[ui_nodes_group_stack.length - 1] : null;
	///if (is_paint || is_sculpt)
	let n: zui_node_t = ui_nodes_canvas_type == canvas_type_t.MATERIAL ? NodesMaterial.create_node("TEX_IMAGE", g) : NodesBrush.create_node("TEX_IMAGE");
	///end
	///if is_lab
	let n: zui_node_t = NodesBrush.create_node("ImageTextureNode");
	///end

	n.buttons[0].default_value = index;
	ui_nodes_get_nodes().nodes_selected_id = [n.id];

	///if is_lab
	ParserLogic.parse(project_canvas);
	///end
}

///if (is_paint || is_sculpt)
function ui_nodes_accept_layer_drag(index: i32) {
	ui_nodes_push_undo();
	if (SlotLayer.is_group(project_layers[index])) return;
	let g: node_group_t = ui_nodes_group_stack.length > 0 ? ui_nodes_group_stack[ui_nodes_group_stack.length - 1] : null;
	let n: zui_node_t = NodesMaterial.create_node(SlotLayer.is_mask(context_raw.layer) ? "LAYER_MASK" : "LAYER", g);
	n.buttons[0].default_value = index;
	ui_nodes_get_nodes().nodes_selected_id = [n.id];
}

function ui_nodes_accept_material_drag(index: i32) {
	ui_nodes_push_undo();
	let g: node_group_t = ui_nodes_group_stack.length > 0 ? ui_nodes_group_stack[ui_nodes_group_stack.length - 1] : null;
	let n: zui_node_t = NodesMaterial.create_node("MATERIAL", g);
	n.buttons[0].default_value = index;
	ui_nodes_get_nodes().nodes_selected_id = [n.id];
}
///end

function ui_nodes_accept_swatch_drag(swatch: swatch_color_t) {
	///if (is_paint || is_sculpt)
	ui_nodes_push_undo();
	let g: node_group_t = ui_nodes_group_stack.length > 0 ? ui_nodes_group_stack[ui_nodes_group_stack.length - 1] : null;
	let n: zui_node_t = NodesMaterial.create_node("RGB", g);
	n.outputs[0].default_value = [
		color_get_rb(swatch.base) / 255,
		color_get_gb(swatch.base) / 255,
		color_get_bb(swatch.base) / 255,
		color_get_ab(swatch.base) / 255
	];
	ui_nodes_get_nodes().nodes_selected_id = [n.id];
	///end
}

function ui_nodes_make_node(n: zui_node_t, nodes: zui_nodes_t, canvas: zui_node_canvas_t): zui_node_t {
	let node: zui_node_t = json_parse(json_stringify(n));
	node.id = zui_get_node_id(canvas.nodes);
	node.x = ui_nodes_get_node_x();
	node.y = ui_nodes_get_node_y();
	let count: i32 = 0;
	for (let soc of node.inputs) {
		soc.id = zui_get_socket_id(canvas.nodes) + count;
		soc.node_id = node.id;
		count++;
	}
	for (let soc of node.outputs) {
		soc.id = zui_get_socket_id(canvas.nodes) + count;
		soc.node_id = node.id;
		count++;
	}
	return node;
}

function ui_nodes_make_group_node(group_canvas: zui_node_canvas_t, nodes: zui_nodes_t, canvas: zui_node_canvas_t): zui_node_t {
	let n: zui_node_t = NodesMaterial.list[5][0];
	let node: zui_node_t = json_parse(json_stringify(n));
	node.name = group_canvas.name;
	node.id = zui_get_node_id(canvas.nodes);
	node.x = ui_nodes_get_node_x();
	node.y = ui_nodes_get_node_y();
	let group_input: zui_node_t = null;
	let group_output: zui_node_t = null;
	for (let g of project_material_groups) {
		if (g.canvas.name == node.name) {
			for (let n of g.canvas.nodes) {
				if (n.type == "GROUP_INPUT") group_input = n;
				else if (n.type == "GROUP_OUTPUT") group_output = n;
			}
			break;
		}
	}
	if (group_input != null && group_output != null) {
		for (let soc of group_input.outputs) {
			node.inputs.push(NodesMaterial.create_socket(nodes, node, soc.name, soc.type, canvas, soc.min, soc.max, soc.default_value));
		}
		for (let soc of group_output.inputs) {
			node.outputs.push(NodesMaterial.create_socket(nodes, node, soc.name, soc.type, canvas, soc.min, soc.max, soc.default_value));
		}
	}
	return node;
}

///if (is_paint || is_sculpt)
function ui_nodes_make_node_preview() {
	let nodes: zui_nodes_t = context_raw.material.nodes;
	if (nodes.nodes_selected_id.length == 0) return;

	let node: zui_node_t = zui_get_node(context_raw.material.canvas.nodes, nodes.nodes_selected_id[0]);
	// if (node == null) return;
	context_raw.node_preview_name = node.name;

	if (node.type == "LAYER" ||
		node.type == "LAYER_MASK" ||
		node.type == "MATERIAL" ||
		node.type == "OUTPUT_MATERIAL_PBR") return;

	if (context_raw.material.canvas.nodes.indexOf(node) == -1) return;

	if (context_raw.node_preview == null) {
		context_raw.node_preview = image_create_render_target(util_render_material_preview_size, util_render_material_preview_size);
	}

	context_raw.node_preview_dirty = false;
	ui_nodes_hwnd.redraws = 2;
	util_render_make_node_preview(context_raw.material.canvas, node, context_raw.node_preview);
}
///end

function ui_nodes_has_group(c: zui_node_canvas_t): bool {
	for (let n of c.nodes) if (n.type == "GROUP") return true;
	return false;
}

function ui_nodes_traverse_group(mgroups: zui_node_canvas_t[], c: zui_node_canvas_t) {
	for (let n of c.nodes) {
		if (n.type == "GROUP") {
			if (ui_nodes_get_group(mgroups, n.name) == null) {
				let canvases: zui_node_canvas_t[] = [];
				for (let g of project_material_groups) canvases.push(g.canvas);
				let group: zui_node_canvas_t = ui_nodes_get_group(canvases, n.name);
				mgroups.push(json_parse(json_stringify(group)));
				ui_nodes_traverse_group(mgroups, group);
			}
		}
	}
}

function ui_nodes_get_group(canvases: zui_node_canvas_t[], name: string): zui_node_canvas_t {
	for (let c of canvases) if (c.name == name) return c;
	return null;
}
