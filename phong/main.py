import sys
import glfw
import OpenGL
from OpenGL.GL import *
from OpenGL.GL.shaders import *
import win32api, win32con
import glutils
import sys, random, math
import numpy
import numpy as np
import PySimpleGUI as sg
from PIL import Image
strVS = """
#version 330 core
out vec2 texCoord;
void main(){
    float x = -1.0 + float((gl_VertexID & 1) << 2);
    float y = -1.0 + float((gl_VertexID & 2) << 1);
    texCoord.x = (x+1.0)*0.5;
    texCoord.y = (y+1.0)*0.5;
    gl_Position = vec4(x, y, 0, 1);
}
"""
strFS = """
#version 330 core
in vec2 texCoord;
out vec4 color;
uniform float fDeltaTime;
uniform int nCurWidth;
uniform int nCurHeight;
uniform int nMouseX;
uniform int nMouseY;
uniform sampler2D texture1;
void main(){
    color = texture(texture1, vec2(texCoord.x, texCoord.y));
}
"""

need_w_width = 1280
need_w_height = 720
pos_mouse_x = 0
pos_mouse_y = 0
cur_mouse_x = 0
cur_mouse_y = 0
cur_mouse_left_btn_down = 0
deltaTime = 0.0
need_continue_render = True
is_ctrl_key_down = False
#current_cfg_un = numpy.array([0.0, 0.0, 0.0, 0.0], numpy.float32)
arr_pass = []
nCurRenderFrame = 0

def ReadFSStr(sz):
    file = open(sz)
    return file.read()

class RenderToTexture(object):
    def __init__(self, w, h, i, sz):
        self.imageFormat = GL_UNSIGNED_BYTE
        self.imagedata = []
        self.width = w
        self.height = h
        self.pass_index = i
        self.szShadePath = sz
        self.shader = glutils.loadShaders(strVS, ReadFSStr(self.szShadePath))
    
    def __del__(self):
        print("Release fbo")
        #glDeleteFramebuffers(1, [self.fbo])
        #glDeleteTexture(self.fbotext)
        #glDeleteTexture(self.fbodata)
    
    def CreateFBO(self):
        self.fbo = glGenFramebuffers(1)
        glBindFramebuffer(GL_FRAMEBUFFER, self.fbo)
        self.fbotext = glGenTextures(1)
        glBindTexture(GL_TEXTURE_2D, self.fbotext)
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, self.width, self.height,0,GL_RGBA,GL_FLOAT,None)
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP)
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP)
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST)
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST)
        glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_REPLACE)
        glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, self.fbotext, 0)
        glBindFramebuffer(GL_FRAMEBUFFER,0)
        self.fbodata = glGenTextures(1)
        glBindTexture(GL_TEXTURE_2D, self.fbodata)
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP)
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP)
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST)
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST)
        glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_REPLACE)
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, self.width, self.height, 0, GL_RGBA, self.imageFormat, self.imagedata)
        
    def RenderToFBOPassA(self, texid):
        global deltaTime
        global need_w_width
        global need_w_height
        global pos_mouse_x
        global pos_mouse_y
        global arr_pass
        global nCurRenderFrame
        global cur_mouse_left_btn_down
        glBindFramebuffer(GL_FRAMEBUFFER,self.fbo)
        glViewport(0, 0, self.width, self.height)
        glUseProgram(self.shader)
        glActiveTexture(GL_TEXTURE0);
        glBindTexture(GL_TEXTURE_2D, texid);
        glUniform1i(glGetUniformLocation(self.shader, "texture1"), 0);
        glUniform1f(glGetUniformLocation(self.shader, 'fDeltaTime'), deltaTime)
        glUniform1i(glGetUniformLocation(self.shader, 'nCurWidth'), need_w_width)
        glUniform1i(glGetUniformLocation(self.shader, 'nCurHeight'), need_w_height)
        glUniform1i(glGetUniformLocation(self.shader, 'nMouseX'), pos_mouse_x)
        glUniform1i(glGetUniformLocation(self.shader, 'nMouseY'), pos_mouse_y)
        glUniform1i(glGetUniformLocation(self.shader, 'nMouseLBtnDown'), cur_mouse_left_btn_down)
        glUniform1i(glGetUniformLocation(self.shader, 'nPassIndex'), self.pass_index)
        glUniform1i(glGetUniformLocation(self.shader, 'nPassNum'), len(arr_pass))
        glUniform1i(glGetUniformLocation(self.shader, 'nCurFrame'), nCurRenderFrame)
        glDrawArrays(GL_TRIANGLES, 0, 3)
        glUseProgram(0)
        glBindFramebuffer(GL_FRAMEBUFFER,0)
    
    def RenderToFBOPassImage(self, tex_p, blur_tex, sky_tex, font_tex):
        global deltaTime
        global need_w_width
        global need_w_height
        global pos_mouse_x
        global pos_mouse_y
        global arr_pass
        global nCurRenderFrame
        global cur_mouse_left_btn_down
        glBindFramebuffer(GL_FRAMEBUFFER,self.fbo)
        glViewport(0, 0, self.width, self.height)
        glClear(GL_COLOR_BUFFER_BIT)
        glClearColor(1.0, 1.0, 1.0, 1.0)
        glUseProgram(self.shader)
        glActiveTexture(GL_TEXTURE0);
        glBindTexture(GL_TEXTURE_2D, tex_p);
        glUniform1i(glGetUniformLocation(self.shader, "texture0"), 0);
        glActiveTexture(GL_TEXTURE1);
        glBindTexture(GL_TEXTURE_CUBE_MAP, blur_tex);
        glUniform1i(glGetUniformLocation(self.shader, "texture1"), 1);
        glActiveTexture(GL_TEXTURE2);
        glBindTexture(GL_TEXTURE_CUBE_MAP, sky_tex);
        glUniform1i(glGetUniformLocation(self.shader, "texture2"), 2);
        glActiveTexture(GL_TEXTURE3);
        glBindTexture(GL_TEXTURE_2D, font_tex);
        glUniform1i(glGetUniformLocation(self.shader, "texture3"), 3);
        glUniform1f(glGetUniformLocation(self.shader, 'fDeltaTime'), deltaTime)
        glUniform1i(glGetUniformLocation(self.shader, 'nCurWidth'), need_w_width)
        glUniform1i(glGetUniformLocation(self.shader, 'nCurHeight'), need_w_height)
        glUniform1i(glGetUniformLocation(self.shader, 'nMouseX'), pos_mouse_x)
        glUniform1i(glGetUniformLocation(self.shader, 'nMouseY'), pos_mouse_y)
        glUniform1i(glGetUniformLocation(self.shader, 'nMouseLBtnDown'), cur_mouse_left_btn_down)
        glUniform1i(glGetUniformLocation(self.shader, 'nPassIndex'), self.pass_index)
        glUniform1i(glGetUniformLocation(self.shader, 'nPassNum'), len(arr_pass))
        glUniform1i(glGetUniformLocation(self.shader, 'nCurFrame'), nCurRenderFrame)
        glDrawArrays(GL_TRIANGLES, 0, 3)
        glUseProgram(0)
        glBindFramebuffer(GL_FRAMEBUFFER,0)
    
    def ReloadFShader(self):
        self.shader = glutils.loadShaders(strVS, ReadFSStr(self.szShadePath))
    
    def OutputRenderData(self, sz):
        glBindFramebuffer(GL_FRAMEBUFFER,self.fbo)
        buffer_data = glReadPixels(0, 0, self.width, self.height, GL_RGBA, GL_UNSIGNED_BYTE)
        print("fbo 0:",len(buffer_data),buffer_data[0],buffer_data[1],buffer_data[2],buffer_data[3])
        glBindFramebuffer(GL_FRAMEBUFFER,0)
        image = Image.frombytes(mode="RGBA", size=(self.width, self.height), data=buffer_data)    
        image = image.transpose(Image.FLIP_TOP_BOTTOM)
        image.save(sz)#'r2t_result.png'


def GetFSStr(sz):
    if len(sys.argv) < 2:
        file = open("fdog.frag")
    else:
        file = open(sz)#1
    return file.read()

def DoScreenPassRender():
    global deltaTime
    global need_w_width
    global need_w_height
    global pos_mouse_x
    global pos_mouse_y
    global fullscreen_program_final
    global front_tex_id
    global skybox_tex_id
    global blur_tex_id
    global arr_pass
    global nCurRenderFrame
    width, height = glfw.get_framebuffer_size(window)
    if height < 1:
        return
    rpa = arr_pass[0]
    rpi = arr_pass[1]
    rpa.RenderToFBOPassA(rpa.fbotext)
    rpi.RenderToFBOPassImage(rpa.fbotext, blur_tex_id, skybox_tex_id, front_tex_id)
    ratio = width / float(height)
    glViewport(0, 0, width, height)
    glClear(GL_COLOR_BUFFER_BIT)
    glClearColor(0.0, 0.0, 0.0, 0.0)
    glActiveTexture(GL_TEXTURE0)
    glBindTexture(GL_TEXTURE_2D, rpi.fbotext)
    glUseProgram(fullscreen_program_final)
    glUniform1f(glGetUniformLocation(fullscreen_program_final, 'fDeltaTime'), deltaTime)
    glUniform1i(glGetUniformLocation(fullscreen_program_final, 'nCurWidth'), need_w_width)
    glUniform1i(glGetUniformLocation(fullscreen_program_final, 'nCurHeight'), need_w_height)
    glUniform1i(glGetUniformLocation(fullscreen_program_final, 'nMouseX'), pos_mouse_x)
    glUniform1i(glGetUniformLocation(fullscreen_program_final, 'nMouseY'), pos_mouse_y)
    glDrawArrays(GL_TRIANGLES, 0, 3)
    glfw.swap_buffers(window)
    nCurRenderFrame += 1
    return

def DoScreenHaloAdjust():
    global deltaTime
    layout=[
        [sg.Slider(range=(1,7000), orientation='h', size=(35,20), default_value=85, change_submits=True, key='slider')],
        [sg.Quit('exit', key='exit')],]
    window=sg.Window('常用控件',layout,font='微软雅黑')
    while True:
        event, value=window.Read()
        if 'exit' == event:
            break
        elif 'slider' == event:
            deltaTime = value['slider'] / 1000.0;
            DoScreenPassRender()
    window.Close()
    
def on_key(window, key, scancode, action, mods):
    global need_continue_render
    global is_ctrl_key_down
    global arr_pass
    if key == glfw.KEY_ESCAPE and action == glfw.PRESS:
        glfw.set_window_should_close(window, 1)
    elif key == glfw.KEY_R and action == glfw.RELEASE:
        for i in range(len(arr_pass)):
            arr_pass[i].ReloadFShader()
    elif key == glfw.KEY_S and action == glfw.RELEASE:
        need_continue_render = not need_continue_render
    elif key == glfw.KEY_E and action == glfw.RELEASE:
        DoScreenHaloAdjust()
    elif key == glfw.KEY_LEFT_CONTROL and action == glfw.PRESS:
        is_ctrl_key_down = True
        cur_mouse_left_btn_down = 1
        print("OnKey --- LB:", cur_mouse_left_btn_down)
    elif key == glfw.KEY_LEFT_CONTROL and action == glfw.RELEASE:
        is_ctrl_key_down = False
        cur_mouse_left_btn_down = 0
        print("OnKey --- LB:", cur_mouse_left_btn_down)

def on_window_size(window, w, h):
    need_w_width = w
    need_w_height = h
    return

def on_mouse_pos(window, x, y):
    global is_ctrl_key_down
    global cur_mouse_left_btn_down
    global pos_mouse_x
    global pos_mouse_y
    global cur_mouse_x
    global cur_mouse_y
    global need_w_height
    cur_mouse_x = int(x)
    cur_mouse_y = need_w_height - int(y)
    if is_ctrl_key_down or 1 == cur_mouse_left_btn_down:
        pos_mouse_x = cur_mouse_x
        pos_mouse_y = cur_mouse_y
        if pos_mouse_y < 0:
            pos_mouse_y = 0

def on_mouse_button(window, a, b, c):
    global pos_mouse_x
    global pos_mouse_y
    global cur_mouse_x
    global cur_mouse_y
    global cur_mouse_left_btn_down
    if 0 == a:
        if 1 == b:
            cur_mouse_left_btn_down = 1
            pos_mouse_x = cur_mouse_x
            pos_mouse_y = cur_mouse_y
        elif 0 == b:
            cur_mouse_left_btn_down = 0
            
if __name__ == '__main__':
    global fullscreen_program_final
    global front_tex_id
    global skybox_tex_id
    global blur_tex_id
    if not glfw.init():
        sys.exit()
    arr_frag = []
    szCtrlPass = 'ctrl_pass.frag'
    szShowPass = 'phong_pass.frag'
    if len(sys.argv) > 2:
        szCtrlPass = sys.argv[1]
        szShowPass = sys.argv[2]
        print('Input Frag pass A :', szCtrlPass)
        print('Input Frag Image  :', szShowPass)
    screen_width = win32api.GetSystemMetrics(win32con.SM_CXSCREEN) 
    screen_height = win32api.GetSystemMetrics(win32con.SM_CYSCREEN) 
    window = glfw.create_window(need_w_width, need_w_height, "Blinn-Phong", None, None)
    need_w_pos_x = (screen_width - need_w_width) / 2
    need_w_pos_y = (screen_height - need_w_height) / 2
    glfw.set_window_pos(window, int(need_w_pos_x), int(need_w_pos_y))
    if not window:
        glfw.terminate()
        sys.exit()
    glfw.make_context_current(window)
    glfw.set_key_callback(window, on_key)
    glfw.set_window_size_callback(window, on_window_size)
    glfw.set_mouse_button_callback(window, on_mouse_button)
    glfw.set_cursor_pos_callback(window, on_mouse_pos)
    front_tex_id = glutils.loadTextureFlip('front.png')
    skybox_tex_id = glutils.loadCubemapTexture('sky_face_0.png', 'sky_face_1.png', 'sky_face_2.png', 'sky_face_3.png', 'sky_face_4.png', 'sky_face_5.png')
    blur_tex_id = glutils.loadCubemapTexture('blur_face_0.png', 'blur_face_1.png', 'blur_face_2.png', 'blur_face_3.png', 'blur_face_4.png', 'blur_face_5.png')
    rpa = RenderToTexture(need_w_width, need_w_height, 0, szCtrlPass)
    rpa.CreateFBO()
    arr_pass.append(rpa)
    rpi = RenderToTexture(need_w_width, need_w_height, 1, szShowPass)
    rpi.CreateFBO()
    arr_pass.append(rpi)
    fullscreen_program_final = glutils.loadShaders(strVS, strFS)
    while not glfw.window_should_close(window):
        if need_continue_render:
            deltaTime += 0.01;
            if deltaTime > 360.0:
                deltaTime = 0.0
        DoScreenPassRender()
        glfw.poll_events()
    glfw.terminate()