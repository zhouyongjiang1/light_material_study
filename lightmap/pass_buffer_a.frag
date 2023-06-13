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

void main(){
	if( fragCoord.x > 1. || fragCoord.y > 1. ){
        color = vec4(0.);
        return;
    }
    vec4 lastMouseState = textureLod(texture1, fragCoord/iResolution.xy, 0.0);
    float timeSinceMouseChanged = lastMouseState.w;
    timeSinceMouseChanged += 0.1;
    // if mouse state changed or first frame, set timer to 0
    vec3 stateOffset = lastMouseState.xyz - iMouse.xyz;
    if(dot( stateOffset, stateOffset ) > 0.001)
        timeSinceMouseChanged = 0.;
    // record current mouse state and running total time since last change
    color = vec4(iMouse.xyz, timeSinceMouseChanged);
    return;
}