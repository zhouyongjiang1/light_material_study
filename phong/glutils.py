"""
glutils.py
Author: Mahesh Venkitachalam
Some OpenGL utilities.
"""

import OpenGL
from OpenGL.GL import *
from OpenGL.GL.shaders import *

import numpy, math
import numpy as np

from PIL import Image
from PIL import ImageOps

class Camera:
    def __init__(self, eye, center, up):
        self.eye = eye
        self.center = center
        self.up = up

def GenTexture(img):
    imgData = numpy.array(list(img.getdata()), np.int8)
    texture = glGenTextures(1)
    glPixelStorei(GL_UNPACK_ALIGNMENT,1)
    glBindTexture(GL_TEXTURE_2D, texture)
    glPixelStorei(GL_UNPACK_ALIGNMENT,1)
    glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE)
    glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE)
    glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
    glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, img.size[0], img.size[1], 
                 0, GL_RGBA, GL_UNSIGNED_BYTE, imgData)
    glBindTexture(GL_TEXTURE_2D, 0)
    return texture
    
def loadTexture(filename):
    """load OpenGL 2D texture from given image file"""
    img = Image.open(filename)
    if "RGBA" != img.mode:
        raise Exception(print("Image " + filename + " are not RGBA mode!"))
    return GenTexture(img)
    
def loadTextureFlip(filename):
    """load OpenGL 2D texture from given image file"""
    img = Image.open(filename)
    if "RGBA" != img.mode:
        raise Exception(print("Image " + filename + " are not RGBA mode!"))
    img2 = ImageOps.flip(img)
    return GenTexture(img2)

def loadCubemapTexture(f0, f1, f2, f3, f4, f5):
    """load Cubemap from given image file"""
    def GetImgData(f):
        img = Image.open(f)
        if "RGBA" != img.mode:
            raise Exception(print("Image " + f + " are not RGBA mode!"))
        return img.size[0], img.size[1], numpy.array(list(img.getdata()), np.int8)
    imgw0, imgh0, imgD0 = GetImgData(f0)
    imgw1, imgh1, imgD1 = GetImgData(f1)
    imgw2, imgh2, imgD2 = GetImgData(f2)
    imgw3, imgh3, imgD3 = GetImgData(f3)
    imgw4, imgh4, imgD4 = GetImgData(f4)
    imgw5, imgh5, imgD5 = GetImgData(f5)
    glEnable(GL_TEXTURE_GEN_S)                                                                                   
    glEnable(GL_TEXTURE_GEN_T)                                                             
    glEnable(GL_TEXTURE_GEN_R)                                                                  
    glEnable(GL_TEXTURE_CUBE_MAP)
    texture = glGenTextures(1)
    glPixelStorei(GL_UNPACK_ALIGNMENT,1)
    glBindTexture(GL_TEXTURE_CUBE_MAP, texture)
    glTexParameterf(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE)
    glTexParameterf(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE)
    glTexParameterf(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_R, GL_CLAMP_TO_EDGE)
    glTexParameterf(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
    glTexParameterf(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
    glTexImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X, 0, GL_RGBA, imgw0, imgw0, 0, GL_RGBA, GL_UNSIGNED_BYTE, imgD0)
    glTexImage2D(GL_TEXTURE_CUBE_MAP_NEGATIVE_X, 0, GL_RGBA, imgw1, imgw1, 0, GL_RGBA, GL_UNSIGNED_BYTE, imgD1)
    glTexImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_Y, 0, GL_RGBA, imgw2, imgw2, 0, GL_RGBA, GL_UNSIGNED_BYTE, imgD2)
    glTexImage2D(GL_TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, GL_RGBA, imgw3, imgw3, 0, GL_RGBA, GL_UNSIGNED_BYTE, imgD3)
    glTexImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_Z, 0, GL_RGBA, imgw4, imgw4, 0, GL_RGBA, GL_UNSIGNED_BYTE, imgD4)
    glTexImage2D(GL_TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, GL_RGBA, imgw5, imgw5, 0, GL_RGBA, GL_UNSIGNED_BYTE, imgD5)
    glBindTexture(GL_TEXTURE_CUBE_MAP, 0)
    return texture

def perspective(fov, aspect, zNear, zFar):
    """returns matrix equivalent for gluPerspective"""
    fovR = math.radians(45.0)
    f = 1.0/math.tan(fovR/2.0)
    return numpy.array([f/float(aspect), 0.0,   0.0,                0.0, 
                        0.0,        f,   0.0,                0.0, 
                        0.0, 0.0, (zFar+zNear)/float(zNear-zFar),  -1.0, 
                        0.0, 0.0, 2.0*zFar*zNear/float(zNear-zFar), 0.0], 
                       numpy.float32)

def ortho(l, r, b, t, n, f):
    """returns matrix equivalent of glOrtho"""
    return numpy.array([2.0/float(r-l), 0.0, 0.0, 0.0,
                        0.0, 2.0/float(t-b), 0.0, 0.0,
                        0.0, 0.0, -2.0/float(f-n), 0.0,
                        -(r+l)/float(r-l), -(t+b)/float(t-b), 
                        -(f+n)/float(f-n), 1.0], 
                       numpy.float32)


def lookAt(eye, center, up):
    """returns matrix equivalent of gluLookAt - based on MESA implementation"""
    # create an identity matrix
    m = np.identity(4, np.float32)

    forward = np.array(center) - np.array(eye)
    norm = np.linalg.norm(forward)
    forward /= norm
    
    # normalize up vector
    norm = np.linalg.norm(up)
    up /= norm

    # Side = forward x up 
    side = np.cross(forward, up)
    # Recompute up as: up = side x forward 
    up = np.cross(side, forward)

    m[0][0] = side[0]
    m[1][0] = side[1]
    m[2][0] = side[2]
 
    m[0][1] = up[0]
    m[1][1] = up[1]
    m[2][1] = up[2]
 
    m[0][2] = -forward[0]
    m[1][2] = -forward[1]
    m[2][2] = -forward[2]

    # eye translation
    t = np.identity(4, np.float32)
    t[3][0] += -eye[0]
    t[3][1] += -eye[1]
    t[3][2] += -eye[2]
    
    return t.dot(m)

def translate(tx, ty, tz):
    """creates the matrix equivalent of glTranslate"""
    return np.array([1.0, 0.0, 0.0, 0.0, 
                     0.0, 1.0, 0.0, 0.0, 
                     0.0, 0.0, 1.0, 0.0, 
                     tx, ty, tz, 1.0], np.float32)

def compileShader2(source, shaderType):
    """Compile shader source of given type
    source -- GLSL source-code for the shader
    shaderType -- GLenum GL_VERTEX_SHADER, GL_FRAGMENT_SHADER, etc,
    returns GLuint compiled shader reference
    raises RuntimeError when a compilation failure occurs
    """
    if isinstance(source, str):
        print('string shader')
        source = [source]
    elif isinstance(source, bytes):
        print('bytes shader')
        source = [source.decode('utf-8')]
        
    shader = glCreateShader(shaderType)
    glShaderSource(shader, source)
    glCompileShader(shader)
    result = glGetShaderiv(shader, GL_COMPILE_STATUS)
    
    if not(result):
        # TODO: this will be wrong if the user has
        # disabled traditional unpacking array support.
        raise RuntimeError(
            """Shader compile failure (%s): %s"""%(
                result,
                glGetShaderInfoLog( shader ),
                ),
            source,
            shaderType,
            )
    return shader

def loadShaders(strVS, strFS):
    """load vertex and fragment shaders from strings"""
    # compile vertex shader
    shaderV = compileShader([strVS], GL_VERTEX_SHADER)
    # compiler fragment shader
    shaderF = compileShader([strFS], GL_FRAGMENT_SHADER)
    
    # create the program object
    program = glCreateProgram()
    if not program:
        raise RunTimeError('glCreateProgram faled!')

    # attach shaders
    glAttachShader(program, shaderV)
    glAttachShader(program, shaderF)

    # Link the program
    glLinkProgram(program)

    # Check the link status
    linked = glGetProgramiv(program, GL_LINK_STATUS)
    if not linked:
        infoLen = glGetProgramiv(program, GL_INFO_LOG_LENGTH)
        infoLog = ""
        if infoLen > 1:
            infoLog = glGetProgramInfoLog(program, infoLen, None);
        glDeleteProgram(program)
        raise RunTimeError("Error linking program:\n%s\n", infoLog);
    
    return program