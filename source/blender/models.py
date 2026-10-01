import bpy, bmesh, math, os
from mathutils import Vector

OUT = r"C:/Users/harry/Downloads/RMaT/ProjectSiren/assets/models"
os.makedirs(OUT, exist_ok=True)

# ---------------- очистка ----------------
if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.curves, bpy.data.images):
    for d in list(coll): coll.remove(d)
for c in list(bpy.data.collections): bpy.data.collections.remove(c)
sc = bpy.context.scene

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
MATS = {}
def mat(name, col, rough=0.5, metal=0.0, emit=None, alpha=1.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(col), 1)
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*lin(emit[0]), 1); b.inputs['Emission Strength'].default_value = emit[1]
    if alpha < 1: b.inputs['Alpha'].default_value = alpha; m.surface_render_method = 'BLENDED'; m.blend_method = 'BLEND'
    MATS[name] = m; return m

COLL = None
def new_coll(name):
    global COLL
    COLL = bpy.data.collections.new(name); sc.collection.children.link(COLL); return COLL
def put(o, m, nm=None, bevel=0.0, smooth=False):
    for c in o.users_collection: c.objects.unlink(o)
    COLL.objects.link(o)
    if nm: o.name = nm
    if m: o.data.materials.append(m)
    if bevel:
        md = o.modifiers.new('bev', 'BEVEL'); md.width = bevel; md.segments = 2; md.limit_method = 'ANGLE'
    for p in o.data.polygons: p.use_smooth = smooth
    return o
def box(size, loc, m, nm=None, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.active_object
    o.scale = size; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return put(o, m, nm, bevel)
def cyl(r, depth, loc, m, nm=None, rot=(0, 0, 0), verts=32, r2=None, cap='NGON'):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts, end_fill_type=cap)
    else: bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts, end_fill_type=cap)
    return put(bpy.context.active_object, m, nm, smooth=True)
def sph(r, loc, m, nm=None, seg=20):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    return put(bpy.context.active_object, m, nm, smooth=True)
def empty(nm, loc):
    e = bpy.data.objects.new(nm, None); e.location = loc; COLL.objects.link(e); return e
def parent(ch, par):
    bpy.context.view_layer.update(); mw = ch.matrix_world.copy(); ch.parent = par; ch.matrix_world = mw
def origin_to(o, pt):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    sc.cursor.location = pt; bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); sc.cursor.location = (0, 0, 0)
FONT = bpy.data.fonts.load(r"C:/Windows/Fonts/arialbd.ttf", check_existing=True)
def label(text, loc, size, m, nm):
    cu = bpy.data.curves.new(nm, 'FONT'); cu.body = text; cu.font = FONT; cu.size = size
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.extrude = 0.003; cu.resolution_u = 4
    o = bpy.data.objects.new(nm, cu); COLL.objects.link(o); o.location = loc; o.rotation_euler = (math.pi / 2, 0, 0)
    cu.materials.append(m)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH'); return bpy.context.active_object
def quads(nm, polys, m):  # плоские полигоны (полосы «опасность»)
    me = bpy.data.meshes.new(nm); bm = bmesh.new()
    for pts in polys: bm.faces.new([bm.verts.new(p) for p in pts])
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(nm, me); COLL.objects.link(o); o.data.materials.append(m); return o
def hazard_face(nm, p0, u, v, length, height, m, n=None, slant=None):
    p0, u, v = Vector(p0), Vector(u), Vector(v)
    slant = height if slant is None else slant; w = height * 0.9; n = n or int(length / (2 * w)) + 2
    polys = []
    for i in range(-1, n):
        x0 = i * 2 * w
        b0, b1, t0, t1 = x0, x0 + w, x0 + slant, x0 + w + slant
        cl = lambda x: min(max(x, 0), length)
        if cl(b0) == cl(b1) and cl(t0) == cl(t1): continue
        polys.append([p0 + u * cl(b0), p0 + u * cl(b1), p0 + u * cl(t1) + v * height, p0 + u * cl(t0) + v * height])
    return quads(nm, polys, m)

STEEL = mat('steel', '#b9c6cc', 0.35, 0.55); STEEL_D = mat('steelD', '#5d6b72', 0.45, 0.45); BASE = mat('base', '#3b4449', 0.6, 0.2)
SLOT = mat('slot', '#20272b', 0.7); RED = mat('red', '#ff3b47', 0.3); STAIN = mat('stain', '#6e1220', 0.35)
YEL = mat('hazY', '#ffcc33', 0.45); BLK = mat('hazK', '#1e1e1e', 0.6); WHITE = mat('white', '#ffffff', 0.4, emit=('#ffffff', 0.4))
LAMP = mat('lamp', '#ff4a4a', 0.3, emit=('#ff4a4a', 1.5))

# ================= ПРЕСС (перед смотрит в -Y) =================
new_coll('press')
box((1.32, 0.9, 0.3), (0, 0, 0.15), BASE, 'base', 0.02)
box((0.92, 0.62, 0.06), (0, -0.02, 0.33), SLOT, 'slot', 0.01)
for i, (x, y) in enumerate([(-0.3, -0.35), (0.25, -0.38), (0.45, -0.1), (-0.5, 0.1)]):
    cyl(0.06 + 0.02 * (i % 2), 0.005, (x, y, 0.302), STAIN, 'stain%d' % i, verts=16)
for sx in (-1, 1):
    cyl(0.07, 1.85, (sx * 0.53, 0, 1.225), STEEL, 'pillar')
    cyl(0.1, 0.06, (sx * 0.53, 0, 0.33), STEEL_D, 'pillar_foot')
box((1.36, 0.7, 0.32), (0, 0, 2.22), STEEL_D, 'top', 0.02)
box((1.37, 0.01, 0.08), (0, -0.352, 2.12), YEL, 'haz_band')
hazard_face('haz_str', (-0.685, -0.358, 2.08), (1, 0, 0), (0, 0, 1), 1.37, 0.08, BLK)
# пульт «АВТО» прикручен к левой стойке (раньше висел в воздухе)
box((0.2, 0.2, 0.34), (-0.70, 0, 1.55), BASE, 'switch_box', 0.02)
box((0.1, 0.14, 0.06), (-0.62, 0, 1.55), STEEL_D, 'switch_clamp')
sl = box((0.03, 0.03, 0.16), (-0.70, -0.12, 1.63), STEEL, 'switch_lever'); origin_to(sl, (-0.70, -0.12, 1.55))
sph(0.035, (-0.70, -0.11, 1.44), LAMP, 'lamp', 12)
plate = box((0.88, 0.6, 0.15), (0, 0, 1.625), STEEL, 'plate', 0.015)
rod = cyl(0.06, 1.0, (0, 0, 2.06 - 0.5), STEEL, 'rod'); origin_to(rod, (0, 0, 2.06))
cyl(0.085, 0.12, (0.72, -0.05, 1.25), BASE, 'lever_hub', rot=(math.pi / 2, 0, 0))
arm = empty('lever_arm', (0.72, -0.12, 1.25))
lr = cyl(0.03, 0.48, (0.72 + 0.24, -0.12, 1.25), STEEL, 'lever_rod', rot=(0, math.pi / 2, 0)); parent(lr, arm)
lk = sph(0.075, (0.72 + 0.48, -0.12, 1.25), RED, 'lever_knob', 16); parent(lk, arm)

# ================= ИНКУБАТОР =================
new_coll('inc')
BODY = mat('incBody', '#d5e2e8', 0.35, 0.3); GLASS = mat('glass', '#c7f1ff', 0.05, 0.0, alpha=0.25)
EGG = mat('egg', '#ff9cc4', 0.35); EMB = mat('emb', '#7a2748', 0.4); LIQ = mat('liq', '#ff8fbf', 0.2, alpha=0.45)
box((1.1, 0.8, 1.25), (0, 0, 0.625), BODY, 'body', 0.04)
box((1.14, 0.84, 0.08), (0, 0, 0.04), BASE, 'foot', 0.01)
cyl(0.5, 0.08, (0, 0, 1.29), STEEL_D, 'collar')
cyl(0.44, 0.14, (0, 0, 1.39), LIQ, 'liquid')
eggs = empty('eggs', (0, 0, 1.4))
for i in range(16):
    a = i * 2.39996; rr = 0.06 + 0.3 * ((i * 0.37) % 1)
    x, y = math.cos(a) * rr, math.sin(a) * rr
    z = 1.38 + 0.08 * ((i * 0.53) % 1) + (0.1 if i > 9 else 0)
    r = 0.045 + 0.03 * ((i * 0.61) % 1)
    e = sph(r, (x, y, z), EGG, 'egg_%d' % i, 14); parent(e, eggs)
    m2 = sph(r * 0.35, (x + r * 0.2, y - r * 0.55, z), EMB, 'emb_%d' % i, 8); parent(m2, e)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.46, location=(0, 0, 1.33), segments=32, ring_count=16)
dome = bpy.context.active_object
bm = bmesh.new(); bm.from_mesh(dome.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.001], context='VERTS'); bm.to_mesh(dome.data); bm.free()
put(dome, GLASS, 'dome', smooth=True)
box((0.2, 0.03, 0.97), (-0.35, -0.41, 0.665), mat('gauge', '#1f2a30', 0.6), 'gauge', 0.01)
for z0, z1, col in ((0.2, 0.77, '#3f6b86'), (0.77, 0.96, '#3ccf7a'), (0.96, 1.12, '#8a5a2b')):
    box((0.14, 0.02, z1 - z0 - 0.006), (-0.35, -0.425, (z0 + z1) / 2), mat('g' + col, col, 0.5, emit=(col, 0.25)), 'gauge_zone')
box((0.2, 0.03, 0.02), (-0.35, -0.44, 0.2), WHITE, 'gauge_marker')
box((0.22, 0.02, 0.012), (-0.35, -0.438, 0.2 + 0.92 * 0.8), mat('gold', '#ffd166', 0.3, emit=('#ffd166', 0.8)), 'protect_line')
cyl(0.18, 0.05, (0.08, -0.41, 0.62), mat('btnRim', '#4a1418', 0.5), 'button_rim', rot=(math.pi / 2, 0, 0))
cyl(0.13, 0.08, (0.08, -0.45, 0.62), RED, 'button_cap', rot=(math.pi / 2, 0, 0))
box((0.24, 0.06, 0.36), (0.38, -0.42, 0.98), BASE, 'switch_box', 0.02)
sl = box((0.03, 0.03, 0.16), (0.38, -0.47, 1.06), STEEL, 'switch_lever'); origin_to(sl, (0.38, -0.47, 0.98))
sph(0.035, (0.38, -0.46, 0.84), LAMP, 'lamp', 12)
for sx in (-0.3, 0.3):
    cyl(0.04, 1.1, (sx, 0.42, 0.6), STEEL_D, 'pipe')

# ================= ТЕРМИНАЛ =================
new_coll('term')
TB = mat('termBody', '#394b53', 0.5, 0.3)
SCR = mat('screen', '#0f3b44', 0.3, emit=('#12c8b4', 0.6))
UIL = mat('uiline', '#6ff0d9', 0.3, emit=('#6ff0d9', 2.5)); COIN = mat('coin', '#ffd166', 0.3, emit=('#ffd166', 1.5))
cyl(0.35, 0.05, (0, 0, 0.025), BASE, 'foot', verts=24)
box((0.32, 0.32, 0.95), (0, 0, 0.5), TB, 'column', 0.02)
tilt = (math.radians(-14), 0, 0)
box((1.1, 0.22, 0.74), (0, 0.02, 1.35), TB, 'head', 0.03, rot=tilt)
box((0.98, 0.02, 0.6), (0, -0.1, 1.36), SCR, 'screen', 0.0, rot=tilt)
for i, w in enumerate((0.6, 0.45, 0.7, 0.35)):
    box((w, 0.01, 0.04), (-0.35 + w / 2, -0.115, 1.55 - i * 0.12), UIL, 'uiline', 0.0, rot=tilt)
cyl(0.07, 0.02, (0.33, -0.12, 1.48), COIN, 'coin', rot=(math.radians(76), 0, 0), verts=24)
box((1.0, 0.36, 0.06), (0, -0.25, 0.95), mat('kb', '#56666d', 0.5), 'keyboard', 0.01, rot=(math.radians(12), 0, 0))

# ================= УТИЛИЗАЦИЯ =================
new_coll('bin')
box((0.8, 0.7, 1.1), (0, 0, 0.55), mat('binY', '#e0b21e', 0.5), 'body', 0.02)
for nm, p0, u in (('hz_f', (-0.4, -0.352, 0.1), (1, 0, 0)), ('hz_b', (0.4, 0.352, 0.1), (-1, 0, 0)), ('hz_l', (-0.402, 0.35, 0.1), (0, -1, 0)), ('hz_r', (0.402, -0.35, 0.1), (0, 1, 0))):
    L = 0.8 if nm in ('hz_f', 'hz_b') else 0.7
    hazard_face(nm, p0, u, (0, 0, 1), L, 0.18, BLK)
box((0.6, 0.06, 0.3), (0, -0.34, 0.86), mat('chute', '#141414', 0.8), 'chute', 0.02)
box((0.64, 0.1, 0.05), (0, -0.37, 1.03), STEEL_D, 'lip', 0.01)

# ================= ВОРОНКА «КОРМ» =================
new_coll('funnel')
FY = mat('funY', '#ffd84d', 0.35, 0.15); FIN = mat('funIn', '#3a2808', 0.7)
cyl(0.3, 0.04, (0, 0, 0.02), BASE, 'foot', verts=24)
cyl(0.06, 0.95, (0, 0, 0.475), STEEL_D, 'pole')
cone = cyl(0.09, 0.5, (0, 0, 1.2), FY, 'cone', r2=0.47, cap='NOTHING', verts=40)
sol = cone.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.02
cyl(0.08, 0.48, (0, 0, 1.215), FIN, 'cone_in', r2=0.45, cap='NOTHING', verts=40)
# полосатый обод
me = bpy.data.meshes.new('rim'); bmr = bmesh.new(); N = 40
for i in range(N):
    a0, a1 = i / N * math.tau, (i + 1) / N * math.tau
    vs = [bmr.verts.new((math.cos(a) * r, math.sin(a) * r, z)) for a, r, z in ((a0, 0.475, 1.41), (a1, 0.475, 1.41), (a1, 0.482, 1.48), (a0, 0.482, 1.48))]
    f = bmr.faces.new(vs); f.material_index = i % 2
bmr.to_mesh(me); bmr.free(); rim = bpy.data.objects.new('rim', me); COLL.objects.link(rim); me.materials.append(YEL); me.materials.append(BLK)
sd = rim.modifiers.new('sol', 'SOLIDIFY'); sd.thickness = 0.012
box((0.6, 0.04, 0.26), (0, -0.2, 0.72), mat('sign', '#12232a', 0.6), 'sign', 0.015)

# ================= экспорт GLB =================
res = {}
for cname in ('press', 'inc', 'term', 'bin', 'funnel'):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.collections[cname].all_objects: o.select_set(True)
    path = os.path.join(OUT, cname + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_cameras=False, export_lights=False, export_animations=False)
    res[cname] = os.path.getsize(path)
print('EXPORTED', res)
