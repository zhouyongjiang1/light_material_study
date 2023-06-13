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
uniform sampler2D texture1;

float iTime = fDeltaTime * 0.5;
vec2 iResolution = vec2(float(nCurWidth), float(nCurHeight));
vec2 fragCoord = iResolution * texCoord;
vec4 iMouse = vec4(nMouseX, nMouseY, nMouseLBtnDown, 0);

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

const float FOCUS_ROUGHNESS_SLIDER = 1.;
const float FOCUS_OBJ = 2.;
const float FOCUS_COLOR = 3.;
const float FOCUS_LIGHTDIR_SLIDER = 4.;
const float FOCUS_VIEWDIR_SLIDER = 5.;
const float FOCUS_DIFFUSE = 6.;
const float FOCUS_SPECULAR = 7.;
const float FOCUS_AMBIENT = 8.;
const float FOCUS_FRESNEL = 9.;
const float FOCUS_SHININESS = 10.;

struct AppState
{
    float menuId;
    float padding1;
    float padding2;
    float padding3;
    float focus;
    float focusObjRot;
    float objRot;
    float lightDirRot;
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
    return texelFetch(texture1, ivec2(x, y), 0);
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

void StoreValue(vec2 re, vec4 va, inout vec4 outColor, vec2 coord)
{
    coord = floor(coord);
    outColor = (coord.x == re.x && coord.y == re.y) ? va : outColor;
}

vec4 SaveState(in AppState s, in PhongAppState sp, in vec2 coord)
{
    vec4 ret = vec4(0.);
    StoreValue(vec2(0., 0.), vec4(s.menuId, s.padding1, s.padding2, s.padding3), ret, coord);
    StoreValue(vec2(1., 0.), vec4(s.focus, s.focusObjRot, s.objRot, s.lightDirRot), ret, coord);
    StoreValue(vec2(2., 0.), vec4(sp.menuId, sp.diffuse, sp.specular, sp.ambient), ret, coord);
    StoreValue(vec2(3., 0.), vec4(sp.fresnel, sp.shininess, sp.objRot, sp.lightDirRot), ret, coord);
    ret = nCurFrame >= 10 ? ret : vec4(0.);
    return ret;
}

float saturate(float x)
{
    return clamp(x, 0., 1.);
}

void main(){
    if (fragCoord.x >= 8. || fragCoord.y >= 8.)
        discard;

    AppState s;
    PhongAppState sp;
    LoadState(s, sp);

    vec4 q = iMouse.xyxy / iResolution.xyxy;
    vec4 m = -1. + 2. * q;
    m.xz *= iResolution.x / iResolution.y;
    m *= 100.;

    vec4 sliderM = m - vec2(-110, 74).xyxy;
    if(sliderM.z >= -4. && sliderM.z < 44. && sliderM.w >= 5. && sliderM.w < 15.)
        s.focus = FOCUS_DIFFUSE;
    else if(sliderM.z >= -4. && sliderM.z < 44. && sliderM.w >= -5. && sliderM.w < 5.)
        s.focus = FOCUS_SPECULAR;
    else if(sliderM.z >= -4. && sliderM.z < 44. && sliderM.w >= -15. && sliderM.w < -5.)
        s.focus = FOCUS_AMBIENT;
    else if(sliderM.z >= -4. && sliderM.z < 44. && sliderM.w >= -22. && sliderM.w < -15.)
        s.focus = FOCUS_FRESNEL;
    else if(sliderM.z >= -4. && sliderM.z < 44. && sliderM.w >= -30. && sliderM.w < -23.)
        s.focus = FOCUS_SHININESS;
        
    else if (sliderM.z >= -4. && sliderM.z < 44. && sliderM.w >= -50. && sliderM.w < -40.)
        s.focus = FOCUS_ROUGHNESS_SLIDER;
    else if (sliderM.z >= -4. && sliderM.z < 44. && sliderM.w >= -60. && sliderM.w < -50.)
        s.focus = FOCUS_COLOR;
        
    else if (sliderM.z >= -4. && sliderM.z < 6. && sliderM.w >= -10. && sliderM.w < -4.) {
        s.padding1 = 0.;
        s.menuId = s.menuId == MENU_METAL ? MENU_DIELECTRIC : s.menuId;
    }
    else if (sliderM.z >= -4. && sliderM.z < 6. && sliderM.w >= -4. && sliderM.w < 6.) {
        s.padding1 = 1.;
        s.menuId = s.menuId == MENU_DIELECTRIC ? MENU_METAL : s.menuId;
    }
    else if (m.w > -100. && m.w < 40. && abs(m.z + 20.) < 70.) 
        s.focus = FOCUS_OBJ;
	else if (m.w > -72. && m.w < -63. && m.z > 110.0 && m.z < 140.0)
		s.focus = FOCUS_LIGHTDIR_SLIDER;
	else if (m.w > -81. && m.w < -72. && m.z > 110.0 && m.z < 140.0)
		s.focus = FOCUS_VIEWDIR_SLIDER;
    else {
        s.focus = 0.;
        vec2 mp = (m.xy - vec2(-160, -1));
        float menuId = mp.x < 40. || (mp.x < 60. && (mp.y > 18. && mp.y < 24.)) ? 10. - floor(mp.y / 8.) : -1.;
        if (menuId >= 5. && menuId <= 8.)
            s.menuId = menuId;
        s.padding1 = menuId == MENU_METAL ? 1. : s.padding1;
        s.padding1 = menuId == MENU_DIELECTRIC ? 0. : s.padding1;
    }
    
    if (s.focus == FOCUS_DIFFUSE)
        sp.diffuse = floor(clamp((sliderM.x * 5.) / 32., 0., 5.));
    if (s.focus == FOCUS_SPECULAR)
        sp.specular = floor(clamp((sliderM.x * 5.) / 32., 0., 5.));
    if (s.focus == FOCUS_AMBIENT)
        sp.ambient = floor(clamp((sliderM.x * 5.) / 32., 0., 5.));
    if (s.focus == FOCUS_FRESNEL)
        sp.fresnel = saturate(sliderM.x / 40.);
    if (s.focus == FOCUS_SHININESS)
        sp.shininess = saturate(sliderM.x / 40.);
        
    if (s.focus == FOCUS_ROUGHNESS_SLIDER)
        s.padding2 = saturate(sliderM.x / 40.);
    if (s.focus == FOCUS_COLOR)
        s.padding3 = floor(clamp((sliderM.x * 5.) / 32., 0., 5.));
    if (s.focus == FOCUS_OBJ)
        s.objRot = 2.7 * (m.x) / 60.0;
	if (s.focus == FOCUS_LIGHTDIR_SLIDER)
		s.lightDirRot = (m.z - 110.0) / 30.0;
	if (s.focus == FOCUS_VIEWDIR_SLIDER)
		s.focusObjRot = (m.z - 110.0) / 30.0;

    color = SaveState(s, sp, fragCoord);
    return;
}