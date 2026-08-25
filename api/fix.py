import sys
with open('app/routers/superadmin.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Update get_all_coaches
old1 = '''            "fecha_vencimiento": e.fecha_vencimiento,
            "total_alumnos": total_alumnos,
            "deuda_estimada_mes": deuda,
            "pago_mes_registrado": pago_mes is not None
        })
    return result'''
new1 = '''            "fecha_vencimiento": e.fecha_vencimiento,
            "en_periodo_prueba": e.en_periodo_prueba,
            "fecha_fin_prueba": e.fecha_fin_prueba,
            "total_alumnos": total_alumnos,
            "deuda_estimada_mes": deuda,
            "pago_mes_registrado": pago_mes is not None
        })
    return result'''
if old1 in content:
    content = content.replace(old1, new1)
else:
    print("old1 not found")

# Update update_coach_financial middle
old2 = '''    if update_data.monto_fijo is not None:
        entrenador.monto_fijo = update_data.monto_fijo
    if update_data.estado_activo is not None:
        entrenador.estado_activo = update_data.estado_activo
        
    db.commit()'''
new2 = '''    if update_data.monto_fijo is not None:
        entrenador.monto_fijo = update_data.monto_fijo
    if update_data.estado_activo is not None:
        entrenador.estado_activo = update_data.estado_activo
    if update_data.en_periodo_prueba is not None:
        entrenador.en_periodo_prueba = update_data.en_periodo_prueba
    if update_data.fecha_fin_prueba is not None:
        entrenador.fecha_fin_prueba = update_data.fecha_fin_prueba
        
    db.commit()'''
if old2 in content:
    content = content.replace(old2, new2)
else:
    print("old2 not found")

# Update update_coach_financial end
old3 = '''        "monto_fijo": entrenador.monto_fijo,
        "fecha_vencimiento": entrenador.fecha_vencimiento,
        "total_alumnos": total_alumnos,
        "deuda_estimada_mes": deuda,
        "pago_mes_registrado": pago_mes is not None
    }'''
new3 = '''        "monto_fijo": entrenador.monto_fijo,
        "fecha_vencimiento": entrenador.fecha_vencimiento,
        "en_periodo_prueba": entrenador.en_periodo_prueba,
        "fecha_fin_prueba": entrenador.fecha_fin_prueba,
        "total_alumnos": total_alumnos,
        "deuda_estimada_mes": deuda,
        "pago_mes_registrado": pago_mes is not None
    }'''
if old3 in content:
    content = content.replace(old3, new3)
else:
    print("old3 not found")

with open('app/routers/superadmin.py', 'w', encoding='utf-8') as f:
    f.write(content)
