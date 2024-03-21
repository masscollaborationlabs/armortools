
type node_shader_t = {
	context?: node_shader_context_t;
	shader_type?: string;
	includes?: string[];
	ins?: string[];
	outs?: string[];
	shared_samplers?: string[];
	uniforms?: string[];
	functions?: map_t<string, string>;
	main?: string;
	main_init?: string;
	main_end?: string;
	main_normal?: string;
	main_textures?: string;
	main_attribs?: string;
	header?: string;
	write_pre?: bool;
	write_normal?: i32;
	write_textures?: i32;
	vstruct_as_vsin?: bool;
	lock?: bool;

	// References
	bposition?: bool;
	wposition?: bool;
	mposition?: bool;
	vposition?: bool;
	wvpposition?: bool;
	ndcpos?: bool;
	wtangent?: bool;
	vvec?: bool;
	vvec_cam?: bool;
	n?: bool;
	nattr?: bool;
	dotnv?: bool;
	inv_tbn?: bool;
};

function node_shader_create(context: node_shader_context_t, shader_type: string): node_shader_t {
	let raw: node_shader_t = {};
	raw.context = context;
	raw.shader_type = shader_type;
	raw.includes = [];
	raw.ins = [];
	raw.outs = [];
	raw.shared_samplers = [];
	raw.uniforms = [];
	raw.functions = map_create();
	raw.main = '';
	raw.main_init = '';
	raw.main_end = '';
	raw.main_normal = '';
	raw.main_textures = '';
	raw.main_attribs = '';
	raw.header = '';
	raw.write_pre = false;
	raw.write_normal = 0;
	raw.write_textures = 0;
	raw.vstruct_as_vsin = true;
	return raw;
}

function node_shader_add_include(raw: node_shader_t, s: string) {
	array_push(raw.includes, s);
}

function node_shader_add_in(raw: node_shader_t, s: string) {
	array_push(raw.ins, s);
}

function node_shader_add_out(raw: node_shader_t, s: string) {
	array_push(raw.outs, s);
}

function node_shader_add_uniform(raw: node_shader_t, s: string, link: string = null, included: bool = false) {
	let ar: string[] = string_split(s, ' ');
	// layout(RGBA8) image3D voxels
	let utype: string = ar[ar.length - 2];
	let uname: string = ar[ar.length - 1];
	if (starts_with(utype, 'sampler') || starts_with(utype, 'image') || starts_with(utype, 'uimage')) {
		let is_image: bool = (starts_with(utype, 'image') || starts_with(utype, 'uimage')) ? true : false;
		node_shader_context_add_texture_unit(raw.context, utype, uname, link, is_image);
	}
	else {
		// Prefer vec4[] for d3d to avoid padding
		if (ar[0] == 'float' && string_index_of(ar[1], '[') >= 0) {
			ar[0] = 'floats';
			ar[1] = string_split(ar[1], '[')[0];
		}
		else if (ar[0] == 'vec4' && string_index_of(ar[1], '[') >= 0) {
			ar[0] = 'floats';
			ar[1] = string_split(ar[1], '[')[0];
		}
		node_shader_context_add_constant(raw.context, ar[0], ar[1], link);
	}
	if (included == false && array_index_of(raw.uniforms, s) == -1) {
		array_push(raw.uniforms, s);
	}
}

function node_shader_add_shared_sampler(raw: node_shader_t, s: string) {
	if (array_index_of(raw.shared_samplers, s) == -1) {
		array_push(raw.shared_samplers, s);
		let ar: string[] = string_split(s, ' ');
		// layout(RGBA8) sampler2D tex
		let utype: string = ar[ar.length - 2];
		let uname: string = ar[ar.length - 1];
		node_shader_context_add_texture_unit(raw.context, utype, uname, null, false);
	}
}

function node_shader_add_function(raw: node_shader_t, s: string) {
	let fname: string = string_split(s, '(')[0];
	if (raw.functions.has(fname)) {
		return;
	}
	map_set(raw.functions, fname, s);
}

function node_shader_contains(raw: node_shader_t, s: string): bool {
	return string_index_of(raw.main, s) >= 0 ||
		   string_index_of(raw.main_init, s) >= 0 ||
		   string_index_of(raw.main_normal, s) >= 0 ||
		   array_index_of(raw.ins, s) >= 0 ||
		   string_index_of(raw.main_textures, s) >= 0 ||
		   string_index_of(raw.main_attribs, s) >= 0;
}

function node_shader_write_init(raw: node_shader_t, s: string) {
	raw.main_init = s + '\n' + raw.main_init;
}

function node_shader_write(raw: node_shader_t, s: string) {
	if (raw.lock) {
		return;
	}
	if (raw.write_textures > 0) {
		raw.main_textures += s + '\n';
	}
	else if (raw.write_normal > 0) {
		raw.main_normal += s + '\n';
	}
	else if (raw.write_pre) {
		raw.main_init += s + '\n';
	}
	else {
		raw.main += s + '\n';
	}
}

function node_shader_write_header(raw: node_shader_t, s: string) {
	raw.header += s + '\n';
}

function node_shader_write_end(raw: node_shader_t, s: string) {
	raw.main_end += s + '\n';
}

function node_shader_write_attrib(raw: node_shader_t, s: string) {
	raw.main_attribs += s + '\n';
}

function node_shader_data_size(raw: node_shader_t, data: string): string {
	if (data == 'float1') {
		return '1';
	}
	else if (data == 'float2') {
		return '2';
	}
	else if (data == 'float3') {
		return '3';
	}
	else if (data == 'float4') {
		return '4';
	}
	else if (data == 'short2norm') {
		return '2';
	}
	else if (data == 'short4norm') {
		return '4';
	}
	else {
		return '1';
	}
}

function node_shader_vstruct_to_vsin(raw: node_shader_t) {
	// if self.shader_type != 'vert' or self.ins != [] or not self.vstruct_as_vsin: # Vertex structure as vertex shader input
		// return
	let vs: vertex_element_t[] = raw.context.data.vertex_elements;
	for (let i: i32 = 0; i < vs.length; ++i) {
		let e: vertex_element_t = vs[i];
		node_shader_add_in(raw, 'vec' + node_shader_data_size(raw, e.data) + ' ' + e.name);
	}
}

///if (krom_direct3d11 || krom_direct3d12)
function node_shader_get_hlsl(raw: node_shader_t, shared_sampler: string): string {
	let s: string = '#define HLSL\n';
	s += '#define textureArg(tex) Texture2D tex,SamplerState tex ## _sampler\n';
	s += '#define texturePass(tex) tex,tex ## _sampler\n';
	s += '#define sampler2D Texture2D\n';
	s += '#define sampler3D Texture3D\n';
	s += '#define texture(tex, coord) tex.Sample(tex ## _sampler, coord)\n';
	s += `#define textureShared(tex, coord) tex.Sample(${shared_sampler}, coord)\n`;
	s += '#define textureLod(tex, coord, lod) tex.SampleLevel(tex ## _sampler, coord, lod)\n';
	s += `#define textureLodShared(tex, coord, lod) tex.SampleLevel(${shared_sampler}, coord, lod)\n`;
	s += '#define texelFetch(tex, coord, lod) tex.Load(float3(coord.xy, lod))\n';
	s += 'uint2 _GetDimensions(Texture2D tex, uint lod) { uint x, y; tex.GetDimensions(x, y); return uint2(x, y); }\n';
	s += '#define textureSize _GetDimensions\n';
	s += '#define mod(a, b) (a % b)\n';
	s += '#define vec2 float2\n';
	s += '#define vec3 float3\n';
	s += '#define vec4 float4\n';
	s += '#define ivec2 int2\n';
	s += '#define ivec3 int3\n';
	s += '#define ivec4 int4\n';
	s += '#define mat2 float2x2\n';
	s += '#define mat3 float3x3\n';
	s += '#define mat4 float4x4\n';
	s += '#define dFdx ddx\n';
	s += '#define dFdy ddy\n';
	s += '#define inversesqrt rsqrt\n';
	s += '#define fract frac\n';
	s += '#define mix lerp\n';
	// s += '#define fma mad\n';

	s += raw.header;

	let in_ext: string = '';
	let out_ext: string = '';

	for (let i: i32 = 0; i < raw.includes.length; ++i) {
		let a: string = raw.includes[i];
		s += '#include "' + a + '"\n';
	}

	// Input structure
	let index: i32 = 0;
	if (raw.ins.length > 0) {
		s += 'struct SPIRV_Cross_Input {\n';
		index = 0;
		array_sort(raw.ins, function (a, b): i32 {
			// Sort inputs by name
			return substring(a, 4, a.length) >= substring(b, 4, b.length) ? 1 : -1;
		});
		for (let i: i32 = 0; i < raw.ins.length; ++i) {
			let a: string = raw.ins[i];
			s += `${a}${in_ext} : TEXCOORD${index};\n`;
			index++;
		}
		// Built-ins
		if (raw.shader_type == 'vert' && string_index_of(raw.main, "gl_VertexID") >= 0) {
			s += 'uint gl_VertexID : SV_VertexID;\n';
			array_push(raw.ins, 'uint gl_VertexID');
		}
		if (raw.shader_type == 'vert' && string_index_of(raw.main, "gl_InstanceID") >= 0) {
			s += 'uint gl_InstanceID : SV_InstanceID;\n';
			array_push(raw.ins, 'uint gl_InstanceID');
		}
		s += '};\n';
	}

	// Output structure
	let num: i32 = 0;
	if (raw.outs.length > 0 || raw.shader_type == 'vert') {
		s += 'struct SPIRV_Cross_Output {\n';
		array_sort(raw.outs, function (a, b): i32 {
			// Sort outputs by name
			return substring(a, 4, a.length) >= substring(b, 4, b.length) ? 1 : -1;
		});
		index = 0;
		if (raw.shader_type == 'vert') {
			for (let i: i32 = 0; i < raw.outs.length; ++i) {
				let a: string = raw.outs[i];
				s += `${a}${out_ext} : TEXCOORD${index};\n`;
				index++;
			}
			s += 'float4 svpos : SV_POSITION;\n';
		}
		else {
			let out: string = raw.outs[0];
			// Multiple render targets
			if (char_at(out, out.length - 1) == ']') {
				num = parse_int(char_at(out, out.length - 2));
				s += `vec4 fragColor[${num}] : SV_TARGET0;\n`;
			}
			else {
				s += 'vec4 fragColor : SV_TARGET0;\n';
			}
		}
		s += '};\n';
	}

	for (let i: i32 = 0; i < raw.uniforms.length; ++i) {
		let a: string = raw.uniforms[i];
		s += 'uniform ' + a + ';\n';
		if (starts_with(a, 'sampler')) {
			s += 'SamplerState ' + string_split(a, ' ')[1] + '_sampler;\n';
		}
	}

	if (raw.shared_samplers.length > 0) {
		for (let i: i32 = 0; o < raw.shared_samplers.length; ++i) {
			let a: string = raw.shared_samplers[i];
			s += 'uniform ' + a + ';\n';
		}
		s += `SamplerState ${shared_sampler};\n`;
	}

	let values: string[] = map_to_array(raw.functions);
	for (let i: i32 = 0; i < values.length; ++i) {
		let f: string = values[i];
		s += f + '\n';
	}

	// Begin main
	if (raw.outs.length > 0 || raw.shader_type == 'vert') {
		if (raw.ins.length > 0) {
			s += 'SPIRV_Cross_Output main(SPIRV_Cross_Input stage_input) {\n';
		}
		else {
			s += 'SPIRV_Cross_Output main() {\n';
		}
	}
	else {
		if (raw.ins.length > 0) {
			s += 'void main(SPIRV_Cross_Input stage_input) {\n';
		}
		else {
			s += 'void main() {\n';
		}
	}

	// Declare inputs
	for (let i: i32 = 0; i < raw.ins.length; ++i) {
		let a: string = raw.ins[i];
		let b: string = substring(a, 5, a.length); // Remove type 'vec4 '
		s += `${a} = stage_input.${b};\n`;
	}

	if (raw.shader_type == 'vert') {
		s += 'vec4 gl_Position;\n';
		for (let i: i32 = 0; i < raw.outs.length; ++i) {
			let a: string = raw.outs[i];
			s += `${a};\n`;
		}
	}
	else {
		if (raw.outs.length > 0) {
			if (num > 0) {
				s += `vec4 fragColor[${num}];\n`;
			}
			else {
				s += 'vec4 fragColor;\n';
			}
		}
	}

	s += raw.main_attribs;
	s += raw.main_textures;
	s += raw.main_normal;
	s += raw.main_init;
	s += raw.main;
	s += raw.main_end;

	// Write output structure
	if (raw.outs.length > 0 || raw.shader_type == 'vert') {
		s += 'SPIRV_Cross_Output stage_output;\n';
		if (raw.shader_type == 'vert') {
			s += 'gl_Position.z = (gl_Position.z + gl_Position.w) * 0.5;\n';
			s += 'stage_output.svpos = gl_Position;\n';
			for (let i: i32 = 0; i < raw.outs.length; ++i) {
				let a: string = raw.outs[i];
				let b: string = substring(a, 5, a.length); // Remove type 'vec4 '
				s += `stage_output.${b} = ${b};\n`;
			}
		}
		else {
			if (num > 0) {
				for (let i: i32 = 0; i < num; ++i) {
					s += `stage_output.fragColor[${i}] = fragColor[${i}];\n`;
				}
			}
			else {
				s += 'stage_output.fragColor = fragColor;\n';
			}
		}
		s += 'return stage_output;\n';
	}
	s += '}\n';
	return s;
}
///end

///if krom_metal
function node_shader_get_msl(raw: node_shader_t, shared_sampler: string): string {
	let s: string = '#define METAL\n';
	s += '#include <metal_stdlib>\n';
	s += '#include <simd/simd.h>\n';
	s += 'using namespace metal;\n';

	s += '#define textureArg(tex) texture2d<float> tex,sampler tex ## _sampler\n';
	s += '#define texturePass(tex) tex,tex ## _sampler\n';
	s += '#define sampler2D texture2d<float>\n';
	s += '#define sampler3D texture3d<float>\n';
	s += '#define texture(tex, coord) tex.sample(tex ## _sampler, coord)\n';
	s += `#define textureShared(tex, coord) tex.sample(${shared_sampler}, coord)\n`;
	s += '#define textureLod(tex, coord, lod) tex.sample(tex ## _sampler, coord, level(lod))\n';
	s += `#define textureLodShared(tex, coord, lod) tex.sample(${shared_sampler}, coord, level(lod))\n`;
	s += '#define texelFetch(tex, coord, lod) tex.read(uint2(coord), uint(lod))\n';
	s += 'float2 _getDimensions(texture2d<float> tex, uint lod) { return float2(tex.get_width(lod), tex.get_height(lod)); }\n';
	s += '#define textureSize _getDimensions\n';
	s += '#define mod(a, b) fmod(a, b)\n';
	s += '#define vec2 float2\n';
	s += '#define vec3 float3\n';
	s += '#define vec4 float4\n';
	s += '#define ivec2 int2\n';
	s += '#define ivec3 int3\n';
	s += '#define ivec4 int4\n';
	s += '#define mat2 float2x2\n';
	s += '#define mat3 float3x3\n';
	s += '#define mat4 float4x4\n';
	s += '#define dFdx dfdx\n';
	s += '#define dFdy dfdy\n';
	s += '#define inversesqrt rsqrt\n';
	s += '#define mul(a, b) b * a\n';
	s += '#define discard discard_fragment()\n';

	for (let i: i32 = 0; i < raw.includes.length; ++i) {
		let a: string = raw.includes[i];
		s += '#include "' + a + '"\n';
	}

	s += raw.header;

	// Input structure
	let index: i32 = 0;
	//if (ins.length > 0) {
		s += 'struct main_in {\n';
		index = 0;
		array_sort(raw.ins, function (a, b): i32 {
			// Sort inputs by name
			return substring(a, 4, a.length) >= substring(b, 4, b.length) ? 1 : -1;
		});
		if (raw.shader_type == 'vert') {
			for (let i: i32 = 0; i < raw.ins.length; ++i) {
				let a: string = raw.ins[i];
				s += `${a} [[attribute(${index})]];\n`;
				index++;
			}
		}
		else {
			for (let i: i32 = 0; i < raw.ins.length; ++i) {
				let a: string = raw.ins[i];
				s += `${a} [[user(locn${index})]];\n`;
				index++;
			}
		}
		s += '};\n';
	//}

	// Output structure
	let num: i32 = 0;
	if (raw.outs.length > 0 || raw.shader_type == 'vert') {
		s += 'struct main_out {\n';
		array_sort(raw.outs, function (a, b): i32 {
			// Sort outputs by name
			return substring(a, 4, a.length) >= substring(b, 4, b.length) ? 1 : -1;
		});
		index = 0;
		if (raw.shader_type == 'vert') {
			for (let i: i32 = 0; i < raw.outs.length; ++i) {
				let a: string = raw.outs[i];
				s += `${a} [[user(locn${index})]];\n`;
				index++;
			}
			s += 'float4 svpos [[position]];\n';
		}
		else {
			let out: string = raw.outs[0];
			// Multiple render targets
			if (char_at(out, out.length - 1) == ']') {
				num = parse_int(char_at(out, out.length - 2));
				for (let i: i32 = 0; i < num; ++i) {
					s += `float4 fragColor_${i} [[color(${i})]];\n`;
				}
			}
			else {
				s += 'float4 fragColor [[color(0)]];\n';
			}
		}
		s += '};\n';
	}

	let samplers: string[] = [];

	if (raw.uniforms.length > 0) {
		s += 'struct main_uniforms {\n';

		for (let i: i32 = 0; i < raw.uniforms.length; ++i) {
			let a: string = raw.uniforms[i];
			if (starts_with(a, 'sampler')) {
				array_push(samplers, a);
			}
			else {
				s += a + ';\n';
			}
		}

		s += '};\n';
	}

	let values: string[] = map_to_array(raw.functions);
	for (let i: i32 = 0; i < values.length; ++i) {
		let f: string = values[i];
		s += f + '\n';
	}

	// Begin main declaration
	s += '#undef texture\n';

	s += raw.shader_type == 'vert' ? 'vertex ' : 'fragment ';
	s += (raw.outs.length > 0 || raw.shader_type == 'vert') ? 'main_out ' : 'void ';
	s += 'my_main(';
	//if (ins.length > 0) {
		s += 'main_in in [[stage_in]]';
	//}
	if (raw.uniforms.length > 0) {
		let bufi: i32 = raw.shader_type == 'vert' ? 1 : 0;
		s += `, constant main_uniforms& uniforms [[buffer(${bufi})]]`;
	}

	if (samplers.length > 0) {
		for (let i: i32 = 0; i < samplers.length; ++i) {
			s += `, ${samplers[i]} [[texture(${i})]]`;
			s += ', sampler ' + string_split(samplers[i], ' ')[1] + `_sampler [[sampler(${i})]]`;
		}
	}

	if (raw.shared_samplers.length > 0) {
		for (let i: i32 = 0; i < raw.shared_samplers.length; ++i) {
			let index: i32 = samplers.length + i;
			s += `, ${raw.shared_samplers[i]} [[texture(${index})]]`;
		}
		s += `, sampler ${shared_sampler} [[sampler(${samplers.length})]]`;
	}

	// Built-ins
	if (raw.shader_type == 'vert' && string_index_of(raw.main, "gl_VertexID") >= 0) {
		s += ', uint gl_VertexID [[vertex_id]]';
	}
	if (raw.shader_type == 'vert' && string_index_of(raw.main, "gl_InstanceID") >= 0) {
		s += ', uint gl_InstanceID [[instance_id]]';
	}

	// End main declaration
	s += ') {\n';
	s += '#define texture(tex, coord) tex.sample(tex ## _sampler, coord)\n';

	// Declare inputs
	for (let i: i32 = 0; i < raw.ins.length; ++i) {
		let a: string = raw.ins[i];
		let b: string = substring(a, 5, a.length); // Remove type 'vec4 '
		s += `${a} = in.${b};\n`;
	}

	for (let i: i32 = 0; i < raw.uniforms.length; ++i) {
		let a: string = raw.uniforms[i];
		if (!starts_with(a, 'sampler')) {
			let b: string = string_split(a, " ")[1]; // Remove type 'vec4 '
			if (string_index_of(b, "[") >= 0) {
				b = substring(b, 0, string_index_of(b, "["));
				let type: string = string_split(a, " ")[0];
				s += `constant ${type} *${b} = uniforms.${b};\n`;
			}
			else {
				s += `${a} = uniforms.${b};\n`;
			}
		}
	}

	if (raw.shader_type == 'vert') {
		s += 'vec4 gl_Position;\n';
		for (let i: i32 = 0; i < raw.outs.length; ++i) {
			let a: string = raw.outs[i];
			s += `${a};\n`;
		}
	}
	else {
		if (raw.outs.length > 0) {
			if (num > 0) {
				s += `vec4 fragColor[${num}];\n`;
			}
			else {
				s += 'vec4 fragColor;\n';
			}
		}
	}

	s += raw.main_attribs;
	s += raw.main_textures;
	s += raw.main_normal;
	s += raw.main_init;
	s += raw.main;
	s += raw.main_end;

	// Write output structure
	if (raw.outs.length > 0 || raw.shader_type == 'vert') {
		s += 'main_out out = {};\n';
		if (raw.shader_type == 'vert') {
			s += 'gl_Position.z = (gl_Position.z + gl_Position.w) * 0.5;\n';
			s += 'out.svpos = gl_Position;\n';
			for (let i: i32 = 0; i < raw.outs.length; ++i) {
				let a: string = raw.outs[i];
				let b: string = string_split(a, " ")[1]; // Remove type 'vec4 '
				s += `out.${b} = ${b};\n`;
			}
		}
		else {
			if (num > 0) {
				for (let i: i32 = 0; i < num; ++i) {
					s += `out.fragColor_${i} = fragColor[${i}];\n`;
				}
			}
			else {
				s += 'out.fragColor = fragColor;\n';
			}
		}
		s += 'return out;\n';
	}
	s += '}\n';
	return s;
}
///end

///if (krom_opengl || krom_vulkan)
function node_shader_get_glsl(raw: node_shader_t, shared_sampler: string, version_header: string): string {
	let s: string = version_header;
	s += '#define textureArg(tex) sampler2D tex\n';
	s += '#define texturePass(tex) tex\n';
	s += '#define mul(a, b) b * a\n';
	s += '#define textureShared texture\n';
	s += '#define textureLodShared textureLod\n';
	s += '#define atan2(x, y) atan(y, x)\n';
	s += raw.header;

	let in_ext: string = '';
	let out_ext: string = '';

	for (let i: i32 = 0; i < raw.includes.length; ++i) {
		let a: string = raw.includes[i];
		s += '#include "' + a + '"\n';
	}
	for (let i: i32 = 0; i < raw.ins.length; ++i) {
		let a: string = raw.ins[i];
		s += `in ${a}${in_ext};\n`;
	}
	for (let i: i32 = 0; i < raw.outs.length; ++i) {
		let a: string = raw.outs[i];
		s += `out ${a}${out_ext};\n`;
	}
	for (let i: i32 = 0; i < raw.uniforms.length; ++i) {
		let a: string = raw.uniforms[i];
		s += 'uniform ' + a + ';\n';
	}
	for (let i: i32 = 0; i < raw.shared_samplers.length; ++i) {
		let a: string = raw.shared_samplers[i];
		s += 'uniform ' + a + ';\n';
	}
	let values: string[] = map_to_array(raw.functions);
	for (let i: i32 = 0; i < values.length; ++i) {
		let f: string = values[i];
		s += f + '\n';
	}
	s += 'void main() {\n';
	s += raw.main_attribs;
	s += raw.main_textures;
	s += raw.main_normal;
	s += raw.main_init;
	s += raw.main;
	s += raw.main_end;
	s += '}\n';
	return s;
}
///end

function node_shader_get(raw: node_shader_t): string {

	if (raw.shader_type == 'vert' && raw.vstruct_as_vsin) {
		node_shader_vstruct_to_vsin(raw);
	}

	let shared_sampler: string = 'shared_sampler';
	if (raw.shared_samplers.length > 0) {
		shared_sampler = string_split(raw.shared_samplers[0], ' ')[1] + '_sampler';
	}

	///if (krom_direct3d11 || krom_direct3d12)
	let s: string = node_shader_get_hlsl(raw, shared_sampler);
	///elseif krom_metal
	let s: string = node_shader_get_msl(raw, shared_sampler);
	///elseif krom_vulkan
	let version_header: string = '#version 450\n';
	let s: string = node_shader_get_glsl(raw, shared_sampler, version_header);
	///elseif krom_android
	let version_header: string = '#version 300 es\n';
	if (raw.shader_type == 'frag') {
		version_header += 'precision highp float;\n';
		version_header += 'precision mediump int;\n';
	}
	let s: string = node_shader_get_glsl(raw, shared_sampler, version_header);
	///elseif krom_opengl
	let version_header: string = '#version 330\n';
	let s: string = node_shader_get_glsl(raw, shared_sampler, version_header);
	///end

	return s;
}
