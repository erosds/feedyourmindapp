# models.py
from datetime import date, datetime, time
from typing import Optional, List, Union
from decimal import Decimal

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date, Time, DECIMAL, TIMESTAMP, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Updated import section to correctly import Pydantic v2 validators
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict

Base = declarative_base()

# SQLAlchemy Models
class Professor(Base):
    __tablename__ = "professors"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    lessons = relationship("Lesson", back_populates="professor")
    
    """
    Nota sul modello di business:
    - Un professore può essere admin, il che gli dà accesso a funzionalità aggiuntive.
    - Solo un admin può creare altri admin.
    - L'ultimo admin nel sistema non può essere eliminato.
    """
    
class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    birth_date = Column(Date, nullable=True)  # Cambiato da nullable=False a nullable=True
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    # Aggiornare la relazione:
    packages = relationship("Package", secondary="package_students", back_populates="students")
    lessons = relationship("Lesson", back_populates="student")

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    professor_id = Column(Integer, ForeignKey("professors.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    lesson_date = Column(Date, nullable=False)
    duration = Column(DECIMAL(5, 2), nullable=False)
    is_package = Column(Boolean, default=False)
    package_id = Column(Integer, ForeignKey("packages.id", ondelete="SET NULL"), nullable=True)
    hourly_rate = Column(DECIMAL(10, 2), nullable=False)
    total_payment = Column(DECIMAL(10, 2), nullable=False)
    is_paid = Column(Boolean, default=False)
    start_time = Column(Time, nullable=True)  # Nuovo campo
    payment_date = Column(Date, nullable=True)  # Nuovo campo
    price = Column(DECIMAL(10, 2), nullable=False, default=0)  # New field for student payment

    created_at = Column(TIMESTAMP, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("duration > 0", name="positive_duration"),
        CheckConstraint("hourly_rate >= 0", name="positive_rate"),
    )
    
    professor = relationship("Professor", back_populates="lessons")
    student = relationship("Student", back_populates="lessons")
    package = relationship("Package", back_populates="lessons")

# Pydantic Models for API
class ProfessorBase(BaseModel):
    first_name: str
    last_name: str
    username: str
    is_admin: bool = False

class ProfessorCreate(ProfessorBase):
    password: str

class ProfessorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    password: Optional[str] = None
    
class ProfessorResponse(ProfessorBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Modifica agli schemi Pydantic
class StudentBase(BaseModel):
    first_name: str
    last_name: str
    birth_date: Optional[date] = None  # Cambiato da date a Optional[date] = None
    email: Optional[str] = None
    phone: Optional[str] = None

    model_config = ConfigDict(
        json_encoders={
            date: lambda v: v.isoformat() if v else None
        }
    )

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Update Package SQLAlchemy model
class Package(Base):
    __tablename__ = "packages"
    
    id = Column(Integer, primary_key=True, index=True)
    start_date = Column(Date, nullable=False)
    total_hours = Column(DECIMAL(5, 2), nullable=False)
    package_cost = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String, default="in_progress")  # Values: in_progress, expired, completed
    is_paid = Column(Boolean, default=False)
    payment_date = Column(Date, nullable=True)
    remaining_hours = Column(DECIMAL(5, 2))
    expiry_date = Column(Date, nullable=False)
    extension_count = Column(Integer, default=0)  # Nuovo campo per tenere traccia delle estensioni
    notes = Column(String, nullable=True)  # Campo per annotazioni generali
    created_at = Column(TIMESTAMP, server_default=func.now())

    students = relationship("Student", secondary="package_students", back_populates="packages")
    lessons = relationship("Lesson", back_populates="package")

    __table_args__ = (
        CheckConstraint("total_hours > 0", name="positive_hours"),
        CheckConstraint("package_cost >= 0", name="positive_cost"),
    )
    

# Tabella di giunzione per la relazione many-to-many
class PackageStudent(Base):
    __tablename__ = "package_students"
    
    package_id = Column(Integer, ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)


# Update Pydantic models for package
class PackageBase(BaseModel):
    student_ids: List[int]
    start_date: date
    total_hours: Decimal
    package_cost: Decimal
    is_paid: bool = False
    payment_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator('total_hours')
    @classmethod
    def check_positive_hours(cls, v):
        if v <= 0:
            raise ValueError('total_hours must be positive')
        return v
    
    @field_validator('student_ids')
    @classmethod
    def check_students_limit(cls, v):
        if len(v) > 3:
            raise ValueError('Maximum of 3 students allowed per package')
        if len(v) == 0:
            raise ValueError('At least one student must be assigned to the package')
        return v
    
    @field_validator('package_cost')
    @classmethod
    def check_positive_cost(cls, v):
        if v < 0:
            raise ValueError('package_cost must be non-negative')
        return v
    
    @field_validator('payment_date')
    @classmethod
    def check_payment_date(cls, v, info):
        values = info.data
        is_paid = values.get('is_paid', False)
        
        # If paid, payment date is required
        if is_paid and v is None:
            raise ValueError('payment_date is required for paid packages')
        
        # If not paid, payment date must be None
        if not is_paid and v is not None:
            return None
        
        return v

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    start_date: Optional[date] = None
    total_hours: Optional[Decimal] = None
    package_cost: Optional[Decimal] = None
    is_paid: Optional[bool] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None
    
    @field_validator('total_hours')
    @classmethod
    def check_positive_hours(cls, v):
        if v is not None and v <= 0:
            raise ValueError('total_hours must be positive')
        return v
    
    @field_validator('package_cost')
    @classmethod
    def check_positive_cost(cls, v):
        if v is not None and v < 0:
            raise ValueError('package_cost must be non-negative')
        return v
    
    @model_validator(mode='after')
    def validate_payment_fields(self):
        # If is_paid is True, payment_date should be specified
        if self.is_paid is True and self.payment_date is None:
            # We'll set this in the controller
            pass
            
        # If is_paid is False, payment_date should be None
        if self.is_paid is False and self.payment_date is not None:
            self.payment_date = None
            
        return self

class PackageResponse(BaseModel):
    id: int
    student_ids: List[int]
    start_date: date
    total_hours: Decimal
    package_cost: Decimal
    status: str
    is_paid: bool
    payment_date: Optional[date]
    remaining_hours: Decimal
    expiry_date: date
    extension_count: int
    notes: Optional[str]

    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    def set_student_data(cls, values):
        # If values is a SQLAlchemy model
        try:
            # Try to get student_id directly
            student_id = values.get('student_id') or getattr(values, 'student_id', None)
            
            # If no student_id found, look for alternative ways
            if student_id is None:
                # Check if there's a relationship with student
                student = getattr(values, 'student', None)
                if student:
                    student_id = student.id
            
            # Set student_ids if not already set
            if not hasattr(values, 'student_ids'):
                values.student_ids = [student_id] if student_id is not None else []
            
            # Ensure student_id is set
            if student_id is not None:
                values.student_id = student_id
        except Exception as e:
            # Log the error or handle it gracefully
            print(f"Error processing student data: {e}")
        
        return values

class LessonBase(BaseModel):
    professor_id: int
    student_id: int
    lesson_date: date
    duration: Decimal
    is_package: bool = False
    package_id: Optional[int] = None
    hourly_rate: Decimal
    total_payment: Optional[Decimal] = None
    is_paid: bool = False
    start_time: Optional[str] = None  # Usiamo str per l'input, ma convertiamo internamente
    payment_date: Optional[date] = None  # Nuovo campo
    price: Optional[Decimal] = Decimal('0')  # New field with default value 0

    @field_validator('duration')
    @classmethod
    def check_positive_duration(cls, v):
        if v <= 0:
            raise ValueError('duration must be positive')
        return v
    
    @field_validator('hourly_rate')
    @classmethod
    def check_positive_rate(cls, v):
        if v < 0:
            raise ValueError('hourly_rate must be non-negative')
        return v
    
    @field_validator('start_time')
    @classmethod
    def validate_time(cls, v):
        if isinstance(v, str) and v:
            from app.utils import parse_time_string
            time_obj = parse_time_string(v)
            if time_obj is None:
                raise ValueError("Invalid time format. Use HH:MM or HH:MM:SS")
            return v  # Manteniamo la stringa originale per compatibilità
        return v
    
    @model_validator(mode='after')
    def calculate_total_payment(self):
        duration = self.duration
        hourly_rate = self.hourly_rate
        if duration is not None and hourly_rate is not None:
            self.total_payment = duration * hourly_rate
        return self

class LessonCreate(BaseModel):
    professor_id: int
    student_id: int
    lesson_date: date
    start_time: Optional[str] = None  # Nuovo campo
    duration: Decimal
    is_package: bool = False
    package_id: Optional[int] = None
    hourly_rate: Decimal
    is_paid: bool = True  # Campo aggiunto per il pagamento
    payment_date: Optional[date] = None  # Nuovo campo
    price: Optional[Decimal] = Decimal('0')  # New field with default value 0

    model_config = ConfigDict(from_attributes=True)

class LessonUpdate(BaseModel):
    professor_id: Optional[int] = None
    student_id: Optional[int] = None
    lesson_date: Optional[date] = None
    start_time: Optional[str] = None  # Nuovo campo
    duration: Optional[Decimal] = None
    is_package: Optional[bool] = None
    package_id: Optional[int] = None
    hourly_rate: Optional[Decimal] = None
    total_payment: Optional[Decimal] = None
    is_paid: Optional[bool] = None  # Campo aggiunto per il pagamento
    payment_date: Optional[date] = None  # Nuovo campo
    price: Optional[Decimal] = None  # New field, optional for updates

    
    @field_validator('duration')
    @classmethod
    def check_positive_duration(cls, v):
        if v is not None and v <= 0:
            raise ValueError('duration must be positive')
        return v
    
    @field_validator('hourly_rate')
    @classmethod
    def check_positive_rate(cls, v):
        if v is not None and v < 0:
            raise ValueError('hourly_rate must be non-negative')
        return v
    
    @field_validator('start_time')
    @classmethod
    def validate_time(cls, v):
        if isinstance(v, str) and v:
            from app.utils import parse_time_string
            time_obj = parse_time_string(v)
            if time_obj is None:
                raise ValueError("Invalid time format. Use HH:MM or HH:MM:SS")
            return v  # Manteniamo la stringa originale per compatibilità
        return v

class LessonResponse(BaseModel):
    id: int
    professor_id: int
    student_id: int
    lesson_date: date
    start_time: Optional[str] = None  # Expecting a string here
    duration: Decimal
    is_package: bool
    package_id: Optional[int]
    hourly_rate: Decimal
    total_payment: Decimal
    is_paid: bool
    payment_date: Optional[date] = None
    price: Decimal  # New field in response

    
    model_config = ConfigDict(from_attributes=True)
    
    @field_validator('start_time', mode='before')
    @classmethod
    def convert_time_to_string(cls, v):
        """Convert time object to string in HH:MM:SS format."""
        if v is None:
            return None
        if isinstance(v, time):
            return v.strftime('%H:%M:%S')
        return v