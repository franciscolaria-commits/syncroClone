"""add coach subscription cancellation and grace period columns

Revision ID: b7c8d9e0f1a2
Revises: f2a3b4c5d6e7
Create Date: 2026-10-19 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column('entrenadores', sa.Column('suscripcion_cancelada', sa.Boolean(), server_default=sa.text('false'), nullable=False))
        op.create_index(op.f('ix_entrenadores_suscripcion_cancelada'), 'entrenadores', ['suscripcion_cancelada'], unique=False)
    except Exception:
        pass

    try:
        op.add_column('entrenadores', sa.Column('fecha_cancelacion', sa.DateTime(), nullable=True))
    except Exception:
        pass

    try:
        op.add_column('entrenadores', sa.Column('prorroga_dias', sa.Integer(), server_default=sa.text('0'), nullable=False))
    except Exception:
        pass

    try:
        op.add_column('entrenadores', sa.Column('fecha_fin_prorroga', sa.DateTime(), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_index(op.f('ix_entrenadores_suscripcion_cancelada'), table_name='entrenadores')
        op.drop_column('entrenadores', 'fecha_fin_prorroga')
        op.drop_column('entrenadores', 'prorroga_dias')
        op.drop_column('entrenadores', 'fecha_cancelacion')
        op.drop_column('entrenadores', 'suscripcion_cancelada')
    except Exception:
        pass
