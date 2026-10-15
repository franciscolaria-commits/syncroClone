"""add parental consent models and columns to alumnos

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-10-15 19:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Columnas en alumnos
    try:
        op.add_column('alumnos', sa.Column('requiere_autorizacion_tutor', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    except Exception:
        pass
    try:
        op.add_column('alumnos', sa.Column('autorizacion_tutor_completada', sa.Boolean(), server_default=sa.text('true'), nullable=False))
    except Exception:
        pass
    try:
        op.add_column('alumnos', sa.Column('email_tutor', sa.String(), nullable=True))
    except Exception:
        pass

    # Tabla consentimientos_menores
    try:
        op.create_table(
            'consentimientos_menores',
            sa.Column('id_consentimiento', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('id_alumno', postgresql.UUID(as_uuid=True), sa.ForeignKey('alumnos.id_usuario', ondelete='CASCADE'), nullable=False),
            sa.Column('email_tutor', sa.String(), nullable=False),
            sa.Column('nombre_tutor', sa.String(), nullable=True),
            sa.Column('vinculo_tutor', sa.String(), nullable=True),
            sa.Column('token_autorizacion', sa.String(), nullable=False),
            sa.Column('fecha_solicitud', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('fecha_autorizacion', sa.DateTime(), nullable=True),
            sa.Column('fecha_expiracion', sa.DateTime(), nullable=False),
            sa.Column('ip_autorizacion', sa.String(), nullable=True),
            sa.Column('user_agent_autorizacion', sa.String(), nullable=True),
            sa.Column('version_politica', sa.String(), nullable=False, server_default='v1.0-2026-10'),
            sa.Column('estado', sa.String(), nullable=False, server_default='pendiente')
        )
        op.create_index('ix_consentimientos_menores_id_alumno', 'consentimientos_menores', ['id_alumno'])
        op.create_index('ix_consentimientos_menores_email_tutor', 'consentimientos_menores', ['email_tutor'])
        op.create_index('ix_consentimientos_menores_token_autorizacion', 'consentimientos_menores', ['token_autorizacion'], unique=True)
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_table('consentimientos_menores')
    except Exception:
        pass
    try:
        op.drop_column('alumnos', 'email_tutor')
    except Exception:
        pass
    try:
        op.drop_column('alumnos', 'autorizacion_tutor_completada')
    except Exception:
        pass
    try:
        op.drop_column('alumnos', 'requiere_autorizacion_tutor')
    except Exception:
        pass
