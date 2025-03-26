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
    
    packages = relationship("Package", back_populates="student")
    lessons = relationship("Lesson", back_populates="student")

class Package(Base):
    __tablename__ = "packages"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    total_hours = Column(DECIMAL(5, 2), nullable=False, default=0)
    package_cost = Column(DECIMAL(10, 2), nullable=False, default=0)
    status = Column(String, default="in_progress")
    is_paid = Column(Boolean, default=True)
    payment_date = Column(Date, nullable=True)  # Nuovo campo
    remaining_hours = Column(DECIMAL(5, 2))
    package_type = Column(String, default="open")  # "fixed" per 4 settimane, "open" per aperto
    expiry_date = Column(Date, nullable=True)  # Data di scadenza per pacchetti a durata fissa
    created_at = Column(TIMESTAMP, server_default=func.now())

    
    __table_args__ = (
        # Modifica questo vincolo per considerare il package_type
        CheckConstraint("(package_type = 'open' AND total_hours >= 0) OR (package_type = 'fixed' AND total_hours > 0)", 
                       name="positive_hours"),
        CheckConstraint("package_cost >= 0", name="positive_cost"),
    )
    
    student = relationship("Student", back_populates="packages")
    lessons = relationship("Lesson", back_populates="package")
    
    """
    Nota sul modello di business:
    - Un pacchetto marcato come pagato (is_paid=True) indica che il cliente ha pagato 
      l'intero pacchetto anticipatamente.
    - Le lezioni all'interno di un pacchetto pagato saranno automaticamente marcate 
      come pagate (is_paid=True).
    - Le lezioni singole hanno il loro stato di pagamento indipendente.
    """

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
    
    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("La password deve essere lunga almeno 8 caratteri")
        if not any(c.isdigit() for c in v):
            raise ValueError("La password deve contenere almeno un numero")
        if not any(c.isupper() for c in v):
            raise ValueError("La password deve contenere almeno una lettera maiuscola")
        if not any(c.islower() for c in v):
            raise ValueError("La password deve contenere almeno una lettera minuscola")
        return v

class ProfessorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    password: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError("La password deve essere lunga almeno 8 caratteri")
        if not any(c.isdigit() for c in v):
            raise ValueError("La password deve contenere almeno un numero")
        if not any(c.isupper() for c in v):
            raise ValueError("La password deve contenere almeno una lettera maiuscola")
        if not any(c.islower() for c in v):
            raise ValueError("La password deve contenere almeno una lettera minuscola")
        return v

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

class PackageBase(BaseModel):
    student_id: int
    start_date: date
    total_hours: Decimal = Decimal('0')  # Default a zero
    package_cost: Decimal = Decimal('0')  # Default a zero
    is_paid: bool = False
    payment_date: Optional[date] = None
    package_type: str = "open"  # Default a 'open'
    expiry_date: Optional[date] = None

    @field_validator('total_hours')
    @classmethod
    def check_hours(cls, v, info):
        # Ottieni il tipo di pacchetto
        values = info.data
        package_type = values.get('package_type', 'open')
        
        # Per pacchetti aperti, permetti zero
        if package_type == 'open':
            return v if v is not None else Decimal('0')
        
        # Per pacchetti fissi, richiedi valore positivo
        if package_type == 'fixed' and (v is None or v <= 0):
            raise ValueError('total_hours must be positive for fixed packages')
        
        return v
    
    @field_validator('package_cost')
    @classmethod
    def check_cost(cls, v, info):
        # Ottieni il tipo di pacchetto
        values = info.data
        package_type = values.get('package_type', 'open')
        
        # Per pacchetti aperti, permetti zero
        if package_type == 'open':
            return v if v is not None else Decimal('0')
        
        # Per pacchetti fissi, richiedi non negativo
        if package_type == 'fixed' and (v is None or v < 0):
            raise ValueError('package_cost must be non-negative for fixed packages')
        
        return v

class PackageCreate(BaseModel):
    student_id: int
    start_date: date
    package_type: str
    is_paid: bool = False
    
    # Campi opzionali con valori di default
    total_hours: Optional[Decimal] = Decimal('0')
    package_cost: Optional[Decimal] = Decimal('0')
    payment_date: Optional[date] = None
    
    @model_validator(mode='after')
    def validate_package_fields(self):
    # Per pacchetti aperti, inizializza sempre a zero (indipendentemente dai valori forniti)
        if self.package_type == 'open':
            # Non sovrascriviamo i valori se è pagato
            if not self.is_paid:
                self.total_hours = Decimal('0')
                self.package_cost = Decimal('0')
            return self
    
    # Per pacchetti fissi, mantieni la validazione precedente
        if self.package_type == 'fixed':
            if self.total_hours is None or self.total_hours <= 0:
                raise ValueError('total_hours must be positive for fixed packages')
            if self.package_cost is None or self.package_cost < 0:
                raise ValueError('package_cost must be non-negative for fixed packages')
    
        return self

class PackageUpdate(BaseModel):
    start_date: Optional[date] = None
    total_hours: Optional[Decimal] = None
    package_cost: Optional[Decimal] = None
    status: Optional[str] = None
    is_paid: Optional[bool] = None
    payment_date: Optional[date] = None
    
    # Nuovi campi
    package_type: Optional[str] = None
    expiry_date: Optional[date] = None

    
    @field_validator('total_hours')
    @classmethod
    def check_positive_hours(cls, v, info):
        # Prima controlla se è un pacchetto aperto
        values = info.data
        if 'package_type' in values and values['package_type'] == 'open':
            # Per i pacchetti aperti, accetta null o zero
            if v is None or v == 0:
                    return Decimal('0')  # Converti null in zero esplicitamente
    
        # Per tutti gli altri casi (pacchetti fissi o se è fornito un valore per pacchetti aperti)
        if v is None:
            raise ValueError('total_hours is required')
    
        if v <= 0:
            raise ValueError('total_hours must be positive')
    
        return v
    
    @field_validator('package_cost')
    @classmethod
    def check_positive_cost(cls, v, info):
        # Per pacchetti aperti, il costo può essere null o >=0
        values = info.data
        if 'package_type' in values and values['package_type'] == 'open':
            if v is None:
                return v
        # Per pacchetti fissi, il costo deve essere >=0
        if v is not None and v < 0:
            raise ValueError('package_cost must be non-negative')
        return v

# Classe di risposta specifica per pacchetti aperti (senza validatori)
class OpenPackageResponse(BaseModel):
    id: int
    student_id: int
    start_date: date
    total_hours: Decimal  # Senza validatore
    package_cost: Decimal  # Senza validatore
    status: str
    is_paid: bool
    remaining_hours: Decimal
    created_at: datetime
    payment_date: Optional[date] = None
    package_type: str
    expiry_date: Optional[date] = None
    
    model_config = ConfigDict(from_attributes=True)

class PackageResponse(PackageBase):
    id: int
    status: str
    remaining_hours: Decimal
    created_at: datetime
    payment_date: Optional[date] = None
    
    model_config = ConfigDict(from_attributes=True)

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