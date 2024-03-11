
class ExportObj {

	static write_string = (out: i32[], str: string) => {
		for (let i: i32 = 0; i < str.length; ++i) {
			out.push(str.charCodeAt(i));
		}
	}

	static run = (path: string, paintObjects: mesh_object_t[], applyDisplacement: bool = false) => {
		let o: i32[] = [];
		ExportObj.write_string(o, "# armorpaint.org\n");

		let poff: i32 = 0;
		let noff: i32 = 0;
		let toff: i32 = 0;
		for (let p of paintObjects) {
			let mesh: mesh_data_t = p.data;
			let inv: f32 = 1 / 32767;
			let sc: f32 = p.data.scale_pos * inv;
			let posa: i16_array_t = mesh.vertex_arrays[0].values;
			let nora: i16_array_t = mesh.vertex_arrays[1].values;
			let texa: i16_array_t = mesh.vertex_arrays[2].values;
			let len: i32 = math_floor(posa.length / 4);

			// Merge shared vertices and remap indices
			let posa2: Int16Array = new Int16Array(len * 3);
			let nora2: Int16Array = new Int16Array(len * 3);
			let texa2: Int16Array = new Int16Array(len * 2);
			let posmap: map_t<i32, i32> = map_create();
			let normap: map_t<i32, i32> = map_create();
			let texmap: map_t<i32, i32> = map_create();

			let pi: i32 = 0;
			let ni: i32 = 0;
			let ti: i32 = 0;
			for (let i: i32 = 0; i < len; ++i) {
				let found: bool = false;
				for (let j: i32 = 0; j < pi; ++j) {
					if (posa2[j * 3    ] == posa[i * 4    ] &&
						posa2[j * 3 + 1] == posa[i * 4 + 1] &&
						posa2[j * 3 + 2] == posa[i * 4 + 2]) {
						posmap.set(i, j);
						found = true;
						break;
					}
				}
				if (!found) {
					posmap.set(i, pi);
					posa2[pi * 3    ] = posa[i * 4    ];
					posa2[pi * 3 + 1] = posa[i * 4 + 1];
					posa2[pi * 3 + 2] = posa[i * 4 + 2];
					pi++;
				}

				found = false;
				for (let j: i32 = 0; j < ni; ++j) {
					if (nora2[j * 3    ] == nora[i * 2    ] &&
						nora2[j * 3 + 1] == nora[i * 2 + 1] &&
						nora2[j * 3 + 2] == posa[i * 4 + 3]) {
						normap.set(i, j);
						found = true;
						break;
					}
				}
				if (!found) {
					normap.set(i, ni);
					nora2[ni * 3    ] = nora[i * 2    ];
					nora2[ni * 3 + 1] = nora[i * 2 + 1];
					nora2[ni * 3 + 2] = posa[i * 4 + 3];
					ni++;
				}

				found = false;
				for (let j: i32 = 0; j < ti; ++j) {
					if (texa2[j * 2    ] == texa[i * 2    ] &&
						texa2[j * 2 + 1] == texa[i * 2 + 1]) {
						texmap.set(i, j);
						found = true;
						break;
					}
				}
				if (!found) {
					texmap.set(i, ti);
					texa2[ti * 2    ] = texa[i * 2    ];
					texa2[ti * 2 + 1] = texa[i * 2 + 1];
					ti++;
				}
			}

			if (applyDisplacement) {
				// let height: buffer_t = layers[0].texpaint_pack.getPixels();
				// let res: i32 = layers[0].texpaint_pack.width;
				// let strength: f32 = 0.1;
				// for (let i: i32 = 0; i < len; ++i) {
				// 	let x: i32 = math_floor(texa2[i * 2    ] / 32767 * res);
				// 	let y: i32 = math_floor((1.0 - texa2[i * 2 + 1] / 32767) * res);
				// 	let h: f32 = (1.0 - height.get((y * res + x) * 4 + 3) / 255) * strength;
				// 	posa2[i * 3    ] -= math_floor(nora2[i * 3    ] * inv * h / sc);
				// 	posa2[i * 3 + 1] -= math_floor(nora2[i * 3 + 1] * inv * h / sc);
				// 	posa2[i * 3 + 2] -= math_floor(nora2[i * 3 + 2] * inv * h / sc);
				// }
			}

			ExportObj.write_string(o, "o " + p.base.name + "\n");
			for (let i: i32 = 0; i < pi; ++i) {
				ExportObj.write_string(o, "v ");
				ExportObj.write_string(o, posa2[i * 3] * sc + "");
				ExportObj.write_string(o, " ");
				ExportObj.write_string(o, posa2[i * 3 + 2] * sc + "");
				ExportObj.write_string(o, " ");
				ExportObj.write_string(o, -posa2[i * 3 + 1] * sc + "");
				ExportObj.write_string(o, "\n");
			}
			for (let i: i32 = 0; i < ni; ++i) {
				ExportObj.write_string(o, "vn ");
				ExportObj.write_string(o, nora2[i * 3] * inv + "");
				ExportObj.write_string(o, " ");
				ExportObj.write_string(o, nora2[i * 3 + 2] * inv + "");
				ExportObj.write_string(o, " ");
				ExportObj.write_string(o, -nora2[i * 3 + 1] * inv + "");
				ExportObj.write_string(o, "\n");
			}
			for (let i: i32 = 0; i < ti; ++i) {
				ExportObj.write_string(o, "vt ");
				ExportObj.write_string(o, texa2[i * 2] * inv + "");
				ExportObj.write_string(o, " ");
				ExportObj.write_string(o, 1.0 - texa2[i * 2 + 1] * inv + "");
				ExportObj.write_string(o, "\n");
			}

			let inda: u32_array_t = mesh.index_arrays[0].values;
			for (let i: i32 = 0; i < math_floor(inda.length / 3); ++i) {
				let pi1: i32 = posmap.get(inda[i * 3    ]) + 1 + poff;
				let pi2: i32 = posmap.get(inda[i * 3 + 1]) + 1 + poff;
				let pi3: i32 = posmap.get(inda[i * 3 + 2]) + 1 + poff;
				let ni1: i32 = normap.get(inda[i * 3    ]) + 1 + noff;
				let ni2: i32 = normap.get(inda[i * 3 + 1]) + 1 + noff;
				let ni3: i32 = normap.get(inda[i * 3 + 2]) + 1 + noff;
				let ti1: i32 = texmap.get(inda[i * 3    ]) + 1 + toff;
				let ti2: i32 = texmap.get(inda[i * 3 + 1]) + 1 + toff;
				let ti3: i32 = texmap.get(inda[i * 3 + 2]) + 1 + toff;
				ExportObj.write_string(o, "f ");
				ExportObj.write_string(o, pi1 + "");
				ExportObj.write_string(o, "/");
				ExportObj.write_string(o, ti1 + "");
				ExportObj.write_string(o, "/");
				ExportObj.write_string(o, ni1 + "");
				ExportObj.write_string(o, " ");
				ExportObj.write_string(o, pi2 + "");
				ExportObj.write_string(o, "/");
				ExportObj.write_string(o, ti2 + "");
				ExportObj.write_string(o, "/");
				ExportObj.write_string(o, ni2 + "");
				ExportObj.write_string(o, " ");
				ExportObj.write_string(o, pi3 + "");
				ExportObj.write_string(o, "/");
				ExportObj.write_string(o, ti3 + "");
				ExportObj.write_string(o, "/");
				ExportObj.write_string(o, ni3 + "");
				ExportObj.write_string(o, "\n");
			}
			poff += pi;
			noff += ni;
			toff += ti;
		}

		if (!path.endsWith(".obj")) path += ".obj";

		let b: ArrayBuffer = Uint8Array.from(o).buffer;
		krom_file_save_bytes(path, b, b.byteLength);
	}
}
