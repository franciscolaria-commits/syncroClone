"""add visible_para_entrenador to evaluaciones_fisicas and composicion_corporal

Revision ID: e1f2a3b4c5d6
Revises: 35531aea3ccd
Create Date: 2026-10-13 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = '35531aea3ccd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column('evaluaciones_fisicas', sa.Column('visible_para_entrenador', sa.Boolean(), server_default=sa.text('true'), nullable=False))
    except Exception:
        pass
    try:
        op.add_column('composicion_corporal', sa.Column('visible_para_entrenador', sa.Boolean(), server_default=sa.text('true'), nullable=False))
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_column('evaluaciones_fisicas', 'visible_para_entrenador')
    except Exception:
        pass
    try:
        op.drop_column('composicion_corporal', 'visible_para_entrenador')
    except Exception:
        pass
