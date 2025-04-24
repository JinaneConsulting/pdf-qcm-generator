import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)

class LoginAttemptTracker:
    """
    Classe pour suivre les tentatives de connexion et bloquer les attaques par force brute
    """
    def __init__(self, max_attempts: int = 5, block_duration_minutes: int = 15):
        self.max_attempts = max_attempts
        self.block_duration = timedelta(minutes=block_duration_minutes)
        # Structure des données: {ip: [(timestamp, identifier), ...]}
        self.ip_attempts: Dict[str, List[Tuple[datetime, str]]] = {}
        # {identifier: [(timestamp, ip), ...]}
        self.identifier_attempts: Dict[str, List[Tuple[datetime, str]]] = {}
        # {ip: unblock_time}
        self.blocked_ips: Dict[str, datetime] = {}
        # {identifier: unblock_time}
        self.blocked_identifiers: Dict[str, datetime] = {}

    def clean_old_attempts(self, ip: Optional[str] = None, identifier: Optional[str] = None):
        """Nettoie les anciennes tentatives de connexion"""
        now = datetime.now()
        cutoff_time = now - self.block_duration

        # Nettoyer pour une IP spécifique
        if ip and ip in self.ip_attempts:
            self.ip_attempts[ip] = [
                attempt for attempt in self.ip_attempts[ip]
                if attempt[0] > cutoff_time
            ]
            if not self.ip_attempts[ip]:
                del self.ip_attempts[ip]
        
        # Nettoyer pour un identifiant spécifique
        if identifier and identifier in self.identifier_attempts:
            self.identifier_attempts[identifier] = [
                attempt for attempt in self.identifier_attempts[identifier]
                if attempt[0] > cutoff_time
            ]
            if not self.identifier_attempts[identifier]:
                del self.identifier_attempts[identifier]
        
        # Nettoyer tous les blocages expirés
        if not ip and not identifier:
            expired_ips = [
                ip for ip, unblock_time in self.blocked_ips.items()
                if unblock_time <= now
            ]
            for ip in expired_ips:
                del self.blocked_ips[ip]
            
            expired_identifiers = [
                identifier for identifier, unblock_time in self.blocked_identifiers.items()
                if unblock_time <= now
            ]
            for identifier in expired_identifiers:
                del self.blocked_identifiers[identifier]

    def is_blocked(self, ip: str, identifier: str = None) -> bool:
        """Vérifie si l'IP ou l'identifiant est bloqué"""
        self.clean_old_attempts()
        now = datetime.now()
        
        # Vérifier si l'IP est bloquée
        if ip in self.blocked_ips and self.blocked_ips[ip] > now:
            remaining = (self.blocked_ips[ip] - now).total_seconds() / 60
            logger.warning(f"Tentative depuis une IP bloquée: {ip}. Déblocage dans {remaining:.1f} minutes.")
            return True
        
        # Vérifier si l'identifiant est bloqué
        if identifier and identifier in self.blocked_identifiers and self.blocked_identifiers[identifier] > now:
            remaining = (self.blocked_identifiers[identifier] - now).total_seconds() / 60
            logger.warning(f"Tentative pour un identifiant bloqué: {identifier}. Déblocage dans {remaining:.1f} minutes.")
            return True
        
        return False

    def record_attempt(self, ip: str, identifier: str = None, success: bool = False):
        """Enregistre une tentative de connexion"""
        now = datetime.now()
        
        # En cas de succès, on réinitialise les compteurs
        if success:
            self.clean_old_attempts(ip=ip, identifier=identifier)
            # Débloquer en cas de succès
            if ip in self.blocked_ips:
                del self.blocked_ips[ip]
            if identifier and identifier in self.blocked_identifiers:
                del self.blocked_identifiers[identifier]
            return
        
        # Enregistrer la tentative échouée pour l'IP
        if ip not in self.ip_attempts:
            self.ip_attempts[ip] = []
        self.ip_attempts[ip].append((now, identifier or "unknown"))
        
        # Enregistrer la tentative échouée pour l'identifiant
        if identifier:
            if identifier not in self.identifier_attempts:
                self.identifier_attempts[identifier] = []
            self.identifier_attempts[identifier].append((now, ip))
        
        # Vérifier si on doit bloquer
        self.clean_old_attempts(ip=ip, identifier=identifier)
        
        # Bloquer l'IP si trop de tentatives
        if len(self.ip_attempts.get(ip, [])) >= self.max_attempts:
            block_until = now + self.block_duration
            self.blocked_ips[ip] = block_until
            logger.warning(f"IP bloquée pour trop de tentatives: {ip}. Bloquée jusqu'à {block_until}")
        
        # Bloquer l'identifiant si trop de tentatives
        if identifier and len(self.identifier_attempts.get(identifier, [])) >= self.max_attempts:
            block_until = now + self.block_duration
            self.blocked_identifiers[identifier] = block_until
            logger.warning(f"Identifiant bloqué pour trop de tentatives: {identifier}. Bloqué jusqu'à {block_until}")

    def reset_attempts(self, ip: str = None, identifier: str = None):
        """Réinitialise les tentatives pour une IP et/ou un identifiant"""
        if ip:
            if ip in self.ip_attempts:
                del self.ip_attempts[ip]
            if ip in self.blocked_ips:
                del self.blocked_ips[ip]
                
        if identifier:
            if identifier in self.identifier_attempts:
                del self.identifier_attempts[identifier]
            if identifier in self.blocked_identifiers:
                del self.blocked_identifiers[identifier]

# Instance globale du tracker
login_tracker = LoginAttemptTracker()