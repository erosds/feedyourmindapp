# In alembic/versions/xxxx_add_extension_count.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('packages', sa.Column('extension_count', sa.Integer(), server_default='0'))

def downgrade():
    op.drop_column('packages', 'extension_count')