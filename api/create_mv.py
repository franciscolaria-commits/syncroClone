from app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text('''
        CREATE MATERIALIZED VIEW mv_rep_maxes AS
        SELECT 
            ses.id_alumno,
            re.id_ejercicio,
            CASE 
                WHEN set_r.reps_logradas BETWEEN 1 AND 5 THEN '1-5'
                WHEN set_r.reps_logradas BETWEEN 6 AND 10 THEN '6-10'
                WHEN set_r.reps_logradas BETWEEN 11 AND 15 THEN '11-15'
                ELSE '15+' 
            END AS rep_range,
            MAX(set_r.peso_usado) AS max_peso
        FROM entrenamiento_sets_reales set_r
        JOIN entrenamiento_sesiones ses ON set_r.id_sesion = ses.id_sesion
        JOIN rutinas_ejercicios re ON set_r.id_rutina_ejercicio = re.id_rutina_ejercicio
        WHERE ses.estado = 'completado'
        GROUP BY 
            ses.id_alumno,
            re.id_ejercicio,
            CASE 
                WHEN set_r.reps_logradas BETWEEN 1 AND 5 THEN '1-5'
                WHEN set_r.reps_logradas BETWEEN 6 AND 10 THEN '6-10'
                WHEN set_r.reps_logradas BETWEEN 11 AND 15 THEN '11-15'
                ELSE '15+' 
            END;
    '''))
    
    conn.execute(text('''
        CREATE UNIQUE INDEX idx_mv_rep_maxes_unique 
        ON mv_rep_maxes (id_alumno, id_ejercicio, rep_range);
    '''))
    conn.commit()
    print("SUCCESSFULLY CREATED mv_rep_maxes")
