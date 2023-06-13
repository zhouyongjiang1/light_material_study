#version 330 core
in vec2 texCoord;
out vec4 color;
uniform float fDeltaTime;
uniform int nCurWidth;
uniform int nCurHeight;
uniform int nMouseX;
uniform int nMouseY;
uniform int nMouseLBtnDown;
uniform int nPassIndex;
uniform int nPassNum;
uniform int nCurFrame;
uniform sampler2D texture0;
uniform samplerCube texture1;
uniform samplerCube texture2;
uniform sampler2D texture3;

float iTime = fDeltaTime * 0.5;
vec2 iResolution = vec2(float(nCurWidth), float(nCurHeight));
vec2 fragCoord = iResolution * texCoord;
vec4 iMouse = vec4(nMouseX, nMouseY, nMouseLBtnDown, 0);

const float MATH_PI = float(3.14159);

const float MENU_SURFACE = 0.;
const float MENU_METAL = 1.;
const float MENU_DIELECTRIC = 2.;
const float MENU_ROUGHNESS = 3.;
const float MENU_BASE_COLOR = 4.;
const float MENU_LIGHTING = 5.;
const float MENU_DIFFUSE = 6.;
const float MENU_SPECULAR = 7.;
const float MENU_AMBIENT = 8.;
const float MENU_FRESNEL = 9.;
const float MENU_GEOMETRY = 10.;

const vec3 BASE_COLORS[6] = vec3[6]
(
	vec3(0.74),
	vec3(0.51, 0.72, 0.81),
	vec3(0.66, .85, .42),
	vec3(0.87, 0.53, 0.66),
	vec3(0.51, 0.46, 0.74),
	vec3(0.78, 0.71, 0.45)
	);

struct AppState
{
	float	menuId;
	float	padding1;
	float	padding2;
	float	padding3;
	float	focus;
	float	focusObjRot;
	float	objRot;
	float	lightDirRot;
};

struct PhongAppState
{
    float menuId;
    float diffuse;
    float specular;
    float ambient;
    float fresnel;
    float shininess;
    float objRot;
    float lightDirRot;
};

vec4 LoadValue(int x, int y)
{
	return texelFetch(texture0, ivec2(x, y), 0);
}

void LoadState(out AppState s, out PhongAppState sp)
{
	vec4 data;

	data = LoadValue(0, 0);
	s.menuId = data.x;
	s.padding1 = data.y;
	s.padding2 = data.z;
	s.padding3 = data.w;

	data = LoadValue(1, 0);
	s.focus = data.x;
	s.focusObjRot = data.y;
	s.objRot = data.z;
	s.lightDirRot = data.w;
    
    data = LoadValue(2, 0);
    sp.menuId = data.x;
    sp.diffuse = data.y;
    sp.specular = data.z;
    sp.ambient = data.w;

    data = LoadValue(3, 0);
    sp.fresnel = data.x;
    sp.shininess = data.y;
    sp.objRot = data.z;
    sp.lightDirRot = data.w;
}

void StoreValue(vec2 re, vec4 va, inout vec4 outCol, vec2 fragCoord)
{
	fragCoord = floor(fragCoord);
	outCol = (fragCoord.x == re.x && fragCoord.y == re.y) ? va : outCol;
}

float saturate(float x)
{
	return clamp(x, 0., 1.);
}

vec3 saturate(vec3 x)
{
	return clamp(x, vec3(0.), vec3(1.));
}

float Smooth(float x)
{
	return smoothstep(0., 1., saturate(x));
}

void Repeat(inout float p, float w)
{
	p = mod(p, w) - 0.5f * w;
}

float Circle(vec2 p, float r)
{
	return (length(p / r) - 1.) * r;
}

float Rectangle(vec2 p, vec2 b)
{
	vec2 d = abs(p) - b;
	return min(max(d.x, d.y), 0.) + length(max(d, 0.));
}

void Rotate(inout vec2 p, float a)
{
	p = cos(a) * p + sin(a) * vec2(p.y, -p.x);
}

float Capsule(vec2 p, float r, float c)
{
	return mix(length(p.x) - r, length(vec2(p.x, abs(p.y) - c)) - r, step(c, abs(p.y)));
}

float Arrow(vec2 p, float a, float l, float w)
{
	Rotate(p, a);
	p.y += l;

	float body = Capsule(p, w, l);
	p.y -= w;

	float tip = p.y + l;

	p.y += l + w;
	Rotate(p, +2.);
	tip = max(tip, p.y - 2. * w);
	Rotate(p, -4.);
	tip = max(tip, p.y - 2. * w);

	return min(body, tip);
}

float TextSDF(vec2 p, float glyph)
{
    p = abs(p.x - .5) > .5 || abs(p.y - .5) > .5 ? vec2(0.) : p;
    vec2 p2 = p / 16. + fract(vec2(glyph, 15. - floor(glyph / 16.)) / 16.);
    return 2. * (texture(texture3, p2).w - 127. / 255.);
}

void Diagram(inout vec3 col, vec2 p, in AppState s, in PhongAppState sp)
{
	vec3 surfColor = vec3(0.9, 0.84, 0.8);
	vec3 lightColor = vec3(1.0, 1.0, 1.0);
	vec3 diffuseColor = BASE_COLORS[int(sp.diffuse)];
	vec3 specularColor = BASE_COLORS[int(sp.specular)];

	p -= vec2(84., 44.);

	vec2 t = p - vec2(18., 4.);
	float r = Rectangle(t, vec2(52., 12.));
	col = mix(col, surfColor * diffuseColor, Smooth(-r * 2.));

	t.y += s.padding2 * sin(t.x);
	r = Rectangle(t - vec2(0., 11.), vec2(52., 1.2));
	col = mix(col, surfColor * 0.6, Smooth(-r * 2.));

	// reflection
	r = 1e4;
	t = p - vec2(18., 15.);
	for (int i = 0; i < 3; ++i)
	{
		float off = s.padding2 * (1.5 - float(i)) * .45;
		r = min(r, Arrow(t - vec2(-15. + float(i) * 15., 2.), -0.5 * MATH_PI - 0.9 + off, 12., 1.));
	}
	col = mix(col, specularColor, Smooth(-r * 2.));

	// light in
	r = 1e4;
	t = p - vec2(18., 15.);
	for (int i = 0; i < 3; ++i)
		r = min(r, Arrow(t - vec2(12. + float(i) * 15., 22.), -0.9, 15., 1.));
	col = mix(col, lightColor, Smooth(-r * 2.));
}

float RaySphere(vec3 rayOrigin, vec3 rayDir, vec3 spherePos, float sphereRadius)
{
	vec3 oc = rayOrigin - spherePos;

	float b = dot(oc, rayDir);
	float c = dot(oc, oc) - sphereRadius * sphereRadius;
	float h = b * b - c;

	float t;
	if (h < 0.0)
	{
		t = -1.0;
	}
	else
	{
		t = (-b - sqrt(h));
	}
	return t;
}

float VisibilityTerm(float roughness, float ndotv, float ndotl)
{
	float r2 = roughness * roughness;
	float gv = ndotl * sqrt(ndotv * (ndotv - ndotv * r2) + r2);
	float gl = ndotv * sqrt(ndotl * (ndotl - ndotl * r2) + r2);
	return 0.5 / max(gv + gl, 0.00001);
}

float DistributionTerm(float roughness, float ndoth)
{
	float r2 = roughness * roughness;
	float d = (ndoth * r2 - ndoth) * ndoth + 1.0;
	return r2 / (d * d * MATH_PI);
}

vec3 FresnelTerm(vec3 specularColor, float vdoth)
{
	vec3 fresnel = specularColor + (1. - specularColor) * pow((1. - vdoth), 5.);
	return fresnel;
}

float Cylinder(vec3 p, float r, float height)
{
	float d = length(p.xz) - r;
	d = max(d, abs(p.y) - height);
	return d;
}

float Substract(float a, float b)
{
	return max(a, -b);
}

float SubstractRound(float a, float b, float r)
{
	vec2 u = max(vec2(r + a, r - b), vec2(0.0, 0.0));
	return min(-r, max(a, -b)) + length(u);
}

float Union(float a, float b)
{
	return min(a, b);
}

float Box(vec3 p, vec3 b)
{
	vec3 d = abs(p) - b;
	return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float Sphere(vec3 p, float s)
{
	return length(p) - s;
}

float Torus(vec3 p, float sr, float lr)
{
	return length(vec2(length(p.xz) - lr, p.y)) - sr;
}

float Disc(vec3 p, float r, float t)
{
	float l = length(p.xz) - r;
	return l < 0. ? abs(p.y) - t : length(vec2(p.y, l)) - t;
}

float UnionRound(float a, float b, float k)
{
	float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
	return mix(b, a, h) - k * h * (1.0 - h);
}

float Scene(vec3 p, mat3 localToWorld)
{
	p = p * localToWorld;

	// ring
	vec3 t = p;
	t.y -= -.7;
	float r = Substract(Disc(t, 0.9, .1), Cylinder(t, .7, 2.));
	vec3 t2 = t - vec3(0., 0., 1.0);
	Rotate(t2.xz, 0.25 * MATH_PI);
	r = Substract(r, Box(t2, vec3(.5)));
	r = Union(r, Disc(t + vec3(0., 0.05, 0.), 0.85, .05));

	t = p;
	Rotate(t.yz, -.3);

	// body
	float b = Sphere(t, .8);
	b = Substract(b, Sphere(t - vec3(0., 0., .5), .5));
	b = Substract(b, Sphere(t - vec3(0., 0., -.7), .3));
	b = Substract(b, Box(t, vec3(2., .03, 2.)));
	b = Union(b, Sphere(t, .7));

	float ret = Union(r, b);
	return ret;
}

float CastRay(in vec3 ro, in vec3 rd, mat3 localToWorld)
{
	const float maxd = 5.0;

	float h = 0.5;
	float t = 0.0;

	for (int i = 0; i < 50; ++i)
	{
		if (h < 0.001 || t > maxd)
		{
			break;
		}

		h = Scene(ro + rd * t, localToWorld);
		t += h;
	}

	if (t > maxd)
	{
		t = -1.0;
	}

	return t;
}

vec3 SceneNormal(in vec3 pos, mat3 localToWorld)
{
	vec3 eps = vec3(0.001, 0.0, 0.0);
	vec3 nor = vec3(
		Scene(pos + eps.xyy, localToWorld) - Scene(pos - eps.xyy, localToWorld),
		Scene(pos + eps.yxy, localToWorld) - Scene(pos - eps.yxy, localToWorld),
		Scene(pos + eps.yyx, localToWorld) - Scene(pos - eps.yyx, localToWorld));
	return normalize(nor);
}

float SceneAO(vec3 p, vec3 n, mat3 localToWorld)
{
	float ao = 0.0;
	float s = 1.0;
	for (int i = 0; i < 6; ++i)
	{
		float off = 0.001 + 0.2 * float(i) / 5.;
		float t = Scene(n * off + p, localToWorld);
		ao += (off - t) * s;
		s *= 0.4;
	}
    
    ao = Smooth(1.0 - 12.0 * ao);
    if(ao < 0.0) ao = 0.0;
    return ao;
}

// St. Peter's Basilica SH
// https://www.shadertoy.com/view/lt2GRD
struct SHCoefficients
{
	vec3 l00, l1m1, l10, l11, l2m2, l2m1, l20, l21, l22;
};

const SHCoefficients SH_STPETER = SHCoefficients(
	vec3(0.3623915, 0.2624130, 0.2326261),
	vec3(0.1759131, 0.1436266, 0.1260569),
	vec3(-0.0247311, -0.0101254, -0.0010745),
	vec3(0.0346500, 0.0223184, 0.0101350),
	vec3(0.0198140, 0.0144073, 0.0043987),
	vec3(-0.0469596, -0.0254485, -0.0117786),
	vec3(-0.0898667, -0.0760911, -0.0740964),
	vec3(0.0050194, 0.0038841, 0.0001374),
	vec3(-0.0818750, -0.0321501, 0.0033399)
);

vec3 EnvRemap(vec3 c)
{
	return pow(2. * c, vec3(2.2));
}

vec3 GetLightDir(float fF){
	vec3 lightDir = normalize(vec3(.7, .9, -.2));
	float fLRot = MATH_PI * fF * 2.0;
	mat3 rot = mat3(
		vec3(cos(fLRot), 0., -sin(fLRot)),
		vec3(0., 1., 0.),
		vec3(sin(fLRot), 0., cos(fLRot))
	);
	return normalize(rot * lightDir);
}

vec3 SchlickFresnel(vec3 R0, vec3 N, vec3 L){
	float f0 = 1.0f - max(dot(N, L), 0.0);
    return R0 + (1.0f - R0)*(f0*f0*f0*f0*f0);
}

vec3 BlinnPhong(vec3 lightStrength, vec3 L, vec3 N, vec3 V, vec3 diffuse, vec3 specular, float shininess, float fresnelR0)
{
    float fDiffFactor = max(dot(N, L), 0.0);
    vec3 diff = diffuse * fDiffFactor;
    diff = diff / (diff + 1.0f);
    
    vec3 H = normalize(L+V);
    float m = shininess * 256.0;
    float roughnessFactor = ((m + 8.0) * pow(max(dot(H, N), 0.0), m)) / 8.0;
    vec3 fresnelFactor = SchlickFresnel(vec3(fresnelR0), H, L);
    vec3 spec = fresnelFactor * roughnessFactor * specular;
    spec = spec / (spec + 1.0f);
    
    vec3 col = (diff + spec) * lightStrength;
    return col;
}

void DrawScene(inout vec3 col, vec2 p, in AppState s, in PhongAppState sp)
{
    vec3 lightColor = vec3(2.);
    vec3 lightDir = GetLightDir(s.lightDirRot);

    float a = -iTime * .5;
    mat3 rot = mat3(
        vec3(cos(a), 0., -sin(a)),
        vec3(0., 1., 0.),
        vec3(sin(a), 0., cos(a)));

    p -= vec2(-20., 10.);
    p *= .011;

    float yaw = (s.objRot - MATH_PI) * 2.0;
    mat3 rotZ = mat3(
        vec3(cos(yaw), 0.0, -sin(yaw)),
        vec3(0.0, 1.0, 0.0),
        vec3(sin(yaw), 0.0, cos(yaw)));

    float phi = -0.1 + s.focusObjRot * MATH_PI * 2.0;
    mat3 rotY = mat3(
        vec3(1.0, 0.0, 0.0),
        vec3(0.0, cos(phi), sin(phi)),
        vec3(0.0, -sin(phi), cos(phi)));

    mat3 localToWorld = rotY * rotZ;

    vec3 rayOrigin = vec3(0.0, .5, -3.5);
    vec3 rayDir = normalize(vec3(p.x, p.y, 2.0));
    float t = CastRay(rayOrigin, rayDir, localToWorld);
    if (t > 0.0)
    {
        vec3 pos = rayOrigin + t * rayDir;
        vec3 normal = SceneNormal(pos, localToWorld);
        vec3 viewDir = -rayDir;
        vec3 refl = reflect(rayDir, normal);
        
        vec3 diffuseColor = pow(BASE_COLORS[int(sp.diffuse)], vec3(2.2));
        vec3 specularColor = pow(BASE_COLORS[int(sp.specular)], vec3(2.2));
        vec3 ambientColor = pow(BASE_COLORS[int(sp.ambient)], vec3(2.2));
        if (s.menuId == MENU_DIFFUSE)
        {
            //diffuseColor = vec3(0.0);
            specularColor = vec3(0.0);
            ambientColor = vec3(0.0);
        }
        if (s.menuId == MENU_SPECULAR)
        {
            diffuseColor = vec3(0.0);
            //specularColor = vec3(0.0);
            ambientColor = vec3(0.0);
        }
        if (s.menuId == MENU_AMBIENT)
        {
            diffuseColor = vec3(0.0);
            specularColor = vec3(0.0);
            //ambientColor = vec3(0.0);
        }
        
        float shininess = sp.shininess;
        if(shininess < 0.000001)shininess = 0.000001;
        float fresnelR0 = sp.fresnel;
        lightDir = normalize(lightDir);
        normal = normalize(normal);
        viewDir = normalize(viewDir);
        vec3 col0 = BlinnPhong(lightColor, lightDir, normal, viewDir, 
            diffuseColor, specularColor, shininess, fresnelR0);
        float ao = SceneAO(pos, normal, localToWorld);
        col = col0 * ao + ambientColor * 0.3;
        col = pow(col * 0.6, vec3(1.0 / 2.2));
	}
	else
	{
        // shadow
        float planeT = -(rayOrigin.y + 1.2) / rayDir.y;
        if (planeT > 0.0)
        {
            vec3 p = rayOrigin + planeT * rayDir;
            float radius = .7;
            col *= 0.7 + 0.3 * smoothstep(0.0, 1.0, saturate(length(p + vec3(0.0, 1.0, -0.5)) - radius));
        }
	}
}

void InfoText(inout vec3 col, vec2 p, in AppState s)
{
	p -= vec2(52, 12);
	vec2 q = p;
	if (s.menuId == MENU_METAL || s.menuId == MENU_BASE_COLOR || s.menuId == MENU_AMBIENT)
		p.y -= 6.;
	if (s.menuId == MENU_DIELECTRIC || s.menuId == MENU_FRESNEL)
		p.y += 6.;
	if (s.menuId == MENU_SPECULAR)
	{
		p.y += 6. * 6.;

		if (p.x < 21. && p.y >= 27. && p.y < 30.)
		{
			p.y = 0.;
		}
		else if (s.menuId == MENU_SPECULAR && p.y > 20. && p.y < 28. && p.x < 21.)
		{
			p.y += 3.;
		}
	}

	vec2 scale = vec2(3., 6.);
	vec2 t = floor(p / scale);

	uint v = 0u;
	if (s.menuId == MENU_LIGHTING)
	{
		v = t.y == 2. ? (t.x < 4. ? 1751607628u : (t.x < 8. ? 1735289204u : (t.x < 12. ? 544434464u : (t.x < 16. ? 1869770849u : (t.x < 20. ? 1634560376u : (t.x < 24. ? 543450484u : 2128226u)))))) : v;
		v = t.y == 1. ? (t.x < 4. ? 1634755955u : (t.x < 8. ? 1769234802u : (t.x < 12. ? 1679845230u : (t.x < 16. ? 1969645161u : (t.x < 20. ? 1629513075u : (t.x < 24. ? 2122862u : 0u)))))) : v;
		v = t.y == 0. ? (t.x < 4. ? 1667592307u : (t.x < 8. ? 1918987381u : (t.x < 12. ? 1836016416u : (t.x < 16. ? 1701736304u : (t.x < 20. ? 544437358u : 0u))))) : v;
		v = t.x >= 0. && t.x < 28. ? v : 0u;
	}
	if (s.menuId == MENU_DIFFUSE)
	{
	}
	if (s.menuId == MENU_SPECULAR)
	{
	}
	if (s.menuId == MENU_AMBIENT)
	{
	}

	float c = float((v >> uint(8. * t.x)) & 255u);
	vec3 textColor = vec3(.3);
	p = (p - t * scale) / scale;
	p.x = (p.x - .5) * .45 + .5;
	float sdf = TextSDF(p, c);
	if (c != 0.)
		col = mix(textColor, col, smoothstep(-.05, +.05, sdf));
}

void MenuText(inout vec3 col, vec2 p, in AppState s)
{
	p -= vec2(-160, -1);
	vec2 scale = vec2(4., 8.);
	vec2 t = floor(p / scale);
	float tab = 1.;
	if (t.y >= 0. && t.y < 5.)
	{
		p.x -= tab * scale.x;
		t.x -= tab;
	}
	
	uint v = 0u;
	v = t.y == 10. ? (t.x < 4. ? 1717987652u : (t.x < 8. ? 6648693u : 0u)) : v;
	v = t.y == 9. ? (t.x < 4. ? 1667592275u : (t.x < 8. ? 1918987381u: 0u)) : v;
	v = t.y == 8. ? (t.x < 4. ? 1768058177u : (t.x < 8. ? 7630437u : 0u)) : v;
	v = t.y == 7. ? (t.x < 4. ? 1936028230u : (t.x < 8. ? 7103854u : 0u)) : v;
	v = t.y == 6. ? (t.x < 4. ? 1852401747u : (t.x < 8. ? 1936027241u : 115u)) : v;
	v = t.y == 5. ? (t.x < 4. ? 1751607628u : (t.x < 8. ? 1735289204u : 0u)) : v;
	v = t.y == 4. ? (t.x < 4. ? 1717987652u : (t.x < 8. ? 6648693u : 0u)) : v;
	v = t.y == 3. ? (t.x < 4. ? 1667592275u : (t.x < 8. ? 1918987381u : 0u)) : v;
	v = t.y == 2. ? (t.x < 4. ? 1768058177u : (t.x < 8. ? 7630437u : 0u)) : v;
	v = t.x >= 0. && t.x < 12. ? v : 0u;

	float c = float((v >> uint(8. * t.x)) & 255u);
	vec3 textColor = vec3(.3);
	if (t.y == 10. - s.menuId)
		textColor = vec3(0.74, 0.5, 0.12);

	p = (p - t * scale) / scale;
	p.x = (p.x - .5) * .45 + .5;
	float sdf = TextSDF(p, c);
	if (c != 0.)
		col = mix(textColor, col, smoothstep(-.05, +.05, sdf));
}

void DrawMenuControls(inout vec3 col, vec2 p, in AppState s, in PhongAppState sp)
{
	p -= vec2(-110, 82);
    
	float c3 = Rectangle(p - vec2(19.5, 0.), vec2(21.4, 4.));
	col = mix(col, vec3(0.3), Smooth(-c3 * 2.));
	for (int i = 0; i < 6; ++i)
	{
		vec2 o = vec2(i == int(sp.diffuse) ? 2.5 : 3.5);
		col = mix(col, BASE_COLORS[i], Smooth(-2. * Rectangle(p - vec2(2. + float(i) * 7., 0.), o)));
	}
    
	p.y += 8.;
	c3 = Rectangle(p - vec2(19.5, 0.), vec2(21.4, 4.));
	col = mix(col, vec3(0.3), Smooth(-c3 * 2.));
	for (int i = 0; i < 6; ++i)
	{
		vec2 o = vec2(i == int(sp.specular) ? 2.5 : 3.5);
		col = mix(col, BASE_COLORS[i], Smooth(-2. * Rectangle(p - vec2(2. + float(i) * 7., 0.), o)));
	}
    
	p.y += 8.;
	c3 = Rectangle(p - vec2(19.5, 0.), vec2(21.4, 4.));
	col = mix(col, vec3(0.3), Smooth(-c3 * 2.));
	for (int i = 0; i < 6; ++i)
	{
		vec2 o = vec2(i == int(sp.ambient) ? 2.5 : 3.5);
		col = mix(col, BASE_COLORS[i], Smooth(-2. * Rectangle(p - vec2(2. + float(i) * 7., 0.), o)));
	}
    
	// Fresnel slider
	p.y += 8.;
	float c4 = Capsule(p.yx - vec2(0., 20.), 1., 20.);
	c4 = min(c4, Circle(p - vec2(40. * sp.fresnel, 0.), 2.5));
	col = mix(col, vec3(0.3), Smooth(-c4 * 2.));

	// Shininess slider
	p.y += 8.;
	float c5 = Capsule(p.yx - vec2(0., 20.), 1., 20.);
	c5 = min(c5, Circle(p - vec2(40. * sp.shininess, 0.), 2.5));
	col = mix(col, vec3(0.3), Smooth(-c5 * 2.));
}

void ViewLightDirText(inout vec3 col, vec2 p, in AppState s)
{
	p -= vec2(70, -80);

	vec2 scale = vec2(4., 8.);
	vec2 t = floor(p / scale);
    
	uint v = 0u;
	v = t.y == 0. ? (t.x < 4. ? 2003134806u : (t.x < 8. ? 1919501344u : 0u)) : v;
	v = t.y == 1. ? (t.x < 4. ? 1751607628u : (t.x < 8. ? 1919501428u : 0u)) : v;
	v = t.x >= 0. && t.x < 12. ? v : 0u;

	float c = float((v >> uint(8. * t.x)) & 255u);

	vec3 textColor = vec3(.3);
	p = (p - t * scale) / scale;
	p.x = (p.x - .5) * .45 + .5;
	float sdf = TextSDF(p, c);
	if (c != 0.)
		col = mix(textColor, col, smoothstep(-.05, +.05, sdf));
}

void DrawViewLightDirControls(inout vec3 col, vec2 p, in AppState s){
    p -= vec2(110, -68);
    
    float c1 = 0.0;
    // roughness slider
    c1 = min(c1, Capsule(p.yx - vec2(0., 20.), 1., 20.));
    c1 = min(c1, Circle(p - vec2(40. * s.lightDirRot, 0.), 2.5));
    
    p.y += 9.;
    c1 = min(c1, Capsule(p.yx - vec2(0., 20.), 1., 20.));
    c1 = min(c1, Circle(p - vec2(40. * s.focusObjRot, 0.), 2.5));
    
    col = mix(col, vec3(0.3), Smooth(-c1 * 2.));
    
    return;
}

void main(){
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 q = fragCoord.xy / iResolution.xy;
    vec2 p = -1. + 2. * q;
    p.x *= iResolution.x / iResolution.y;
    p *= 100.;

    AppState s;
    PhongAppState sp;
    LoadState(s, sp);

    vec3 col = vec3(1., .98, .94) * mix(1.0, 0.4, Smooth(abs(.5 - uv.y)));
    float vignette = q.x * q.y * (1.0 - q.x) * (1.0 - q.y);
    vignette = saturate(pow(32.0 * vignette, 0.05));
    col *= vignette;

    DrawScene(col, p, s, sp);
    Diagram(col, p, s, sp);
    InfoText(col, p, s);
    MenuText(col, p, s);
    DrawMenuControls(col, p, s, sp);
    ViewLightDirText(col, p, s);
    DrawViewLightDirControls(col, p, s);

    color = vec4(col, 1.);
    return;
}